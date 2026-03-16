import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { dispatchWebhook } from '@/services/webhook-dispatcher'
import { emitToRoom } from '@/services/socket'

// GET /api/messages?conversationId=xxx
export async function GET(req: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')
    if (!conversationId) {
      return NextResponse.json({ success: false, error: 'conversationId required' }, { status: 400 })
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, name: true, avatar: true, role: true } }
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })

    // Zera contador de não lidas
    await prisma.conversation.update({
      where: { id: conversationId },
      data:  { unreadCount: 0 }
    })

    return NextResponse.json({ success: true, data: messages })
  } catch (err) {
    console.error('[Messages/GET]', err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

// POST /api/messages — envia mensagem via Baileys
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const { conversationId, content, type = 'TEXT', mediaUrl, isPrivate = false } = await req.json()

    if (!conversationId || !content) {
      return NextResponse.json({ success: false, error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const conversation = await prisma.conversation.findUnique({
      where:   { id: conversationId },
      include: { contact: true },
    })
    if (!conversation) {
      return NextResponse.json({ success: false, error: 'Conversa não encontrada' }, { status: 404 })
    }

    const senderName = session.name || 'Atendente'
    const outboundContent = type === 'TEXT' ? `${senderName}:\n\n${content}` : content
    let status = 'SENT'

    // Envia via Baileys (global._waService definido no server.js)
    if (!isPrivate) {
      const wa = (global as any)._waService
      if (wa?.isConnected()) {
        try {
          const phone = conversation.contact.phone.replace(/\D/g, '')
          const jid   = `${phone}@s.whatsapp.net`
          await wa.sendMessage(jid, { type: type.toLowerCase(), content: outboundContent, filePath: mediaUrl })
        } catch (e: any) {
          console.error('[Messages/POST] Erro ao enviar:', e.message)
          status = 'FAILED'
        }
      } else {
        console.warn('[Messages/POST] WhatsApp não conectado — mensagem salva sem envio')
        status = 'FAILED'
      }
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true }
    })
    if (!dbUser) {
      console.warn('[Messages/POST] Usuário da sessão não encontrado. Salvando sem senderId.')
    }
    // Salva no banco
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId:   dbUser?.id ?? null,
        senderType: 'AGENT',
        type,
        content,
        mediaUrl,
        status,
        isPrivate,
        metadata: JSON.stringify({ senderName }),
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true, role: true } }
      },
    })

    // Atualiza conversa
    await prisma.conversation.update({
      where: { id: conversationId },
      data:  { lastMessage: content.substring(0, 100), lastMessageAt: new Date(), status: 'IN_PROGRESS' },
    })

    // Emite via Socket.io (rooms corretos)
    emitToRoom('conversations', 'new_message', { conversationId, message })
    emitToRoom('conversations', 'conversation_update', {
      conversationId,
      lastMessage:   content.substring(0, 100),
      lastMessageAt: new Date().toISOString(),
      status: 'IN_PROGRESS',
    })

    await dispatchWebhook('new_message', { message, conversation })

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (err: any) {
    console.error('[Messages/POST]', err.message)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
