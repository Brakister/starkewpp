import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { emitToRoom } from '@/services/socket'
import { dispatchWebhook } from '@/services/webhook-dispatcher'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    const conv = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: {
        contact: { include: { tags: { include: { tag: true } } } },
        team: true,
        assignments: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, avatar: true, status: true } } }
        },
        tags: { include: { tag: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
          include: { sender: { select: { id: true, name: true, avatar: true } } }
        }
      }
    })
    if (!conv) return NextResponse.json({ success: false, error: 'Não encontrada' }, { status: 404 })
    return NextResponse.json({ success: true, data: conv })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const body = await req.json()
    const { status, teamId, isPrivate } = body

    const updateData: Record<string, unknown> = {}
    if (status) {
      updateData.status = status
      if (status === 'CLOSED') updateData.closedAt = new Date()
    }
    if (teamId !== undefined) updateData.teamId = teamId
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate

    const conv = await prisma.conversation.update({
      where: { id: params.id },
      data: updateData,
      include: { contact: true }
    })

    emitToRoom('conversations', 'conversation_update', { conversationId: params.id, status })

    if (status === 'CLOSED') {
      await dispatchWebhook('conversation_closed', { conversation: conv })

      // System message
      await prisma.message.create({
        data: {
          conversationId: params.id,
          senderType: 'SYSTEM',
          type: 'TEXT',
          content: `Conversa finalizada por ${session.name}`,
          status: 'SENT'
        }
      })
    }

    return NextResponse.json({ success: true, data: conv })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(['ADMIN'])
    await prisma.conversation.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
