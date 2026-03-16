import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { emitToRoom } from '@/services/socket'

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const { conversationId, content, type = 'TEXT', mediaUrl, isPrivate = false } = await req.json()

    if (!conversationId || !content) {
      return NextResponse.json({ success: false, error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const senderName = session.name || 'Atendente'
    const outboundContent = type === 'TEXT' ? `${senderName}:\n\n${content}` : content

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    })
    if (!conversation) {
      return NextResponse.json({ success: false, error: 'Conversa não encontrada' }, { status: 404 })
    }

    let whatsappId: string | null = null
    let status = 'SENT'

    if (!isPrivate) {
      const wa = (global as any)._waService
      if (wa?.isConnected()) {
        try {
          const phone = conversation.contact.phone
          const jid   = `${phone.replace(/\D/g, '')}@s.whatsapp.net`
          await wa.sendMessage(jid, { type: type.toLowerCase(), content: outboundContent })
          status = 'SENT'
        } catch (e: any) {
          console.error('[Send] Erro:', e.message)
          status = 'FAILED'
        }
      } else {
        console.warn('[Send] WhatsApp não conectado')
        status = 'FAILED'
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId:   session.userId,
        senderType: 'AGENT',
        type,
        content,
        mediaUrl,
        whatsappId: whatsappId ?? undefined,
        status,
        isPrivate,
        metadata: JSON.stringify({ senderName }),
      },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    })

    await prisma.conversation.update({
      where: { id: conversationId },
      data:  { lastMessage: content.substring(0, 100), lastMessageAt: new Date(), status: 'IN_PROGRESS' },
    })

    emitToRoom('conversations', 'new_message', { conversationId, message })
    emitToRoom('conversations', 'conversation_update', {
      conversationId,
      lastMessage:   content.substring(0, 100),
      lastMessageAt: new Date().toISOString(),
      status: 'IN_PROGRESS',
    })

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (e: any) {
    console.error('[Whatsapp/send]', e.message)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
