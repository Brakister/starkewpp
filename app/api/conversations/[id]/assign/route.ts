import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { emitToRoom, emitToUser, emitToConversation } from '@/services/socket'
import { dispatchWebhook } from '@/services/webhook-dispatcher'

// POST /api/conversations/[id]/assign
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const { userId } = await req.json()

    let targetUserId = userId || session.userId
    const user = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!user) {
      const fallback = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
      if (!fallback) {
        return NextResponse.json({ success: false, error: 'Nenhum usuário válido para atribuir' }, { status: 400 })
      }
      targetUserId = fallback.id
    }

    // Deactivate current assignments
    await prisma.conversationAssignment.updateMany({
      where: { conversationId: params.id, isActive: true },
      data: { isActive: false }
    })

    // Create new assignment
    const assignment = await prisma.conversationAssignment.create({
      data: { conversationId: params.id, userId: targetUserId },
      include: { user: { select: { id: true, name: true } } }
    })

    // Update conversation status
    await prisma.conversation.update({
      where: { id: params.id },
      data: { status: 'IN_PROGRESS' }
    })

    // Notify all agents
    emitToRoom('conversations', 'conversation_assigned', {
      conversationId: params.id,
      assignedTo: assignment.user
    })
    emitToRoom('conversations', 'conversation_update', {
      conversationId: params.id,
      status: 'IN_PROGRESS'
    })
    emitToConversation(params.id, 'conversation_update', {
      conversationId: params.id,
      status: 'IN_PROGRESS'
    })

    // Notify the assigned user specifically
    emitToUser(targetUserId, 'notification', {
      title: 'Nova conversa atribuída',
      message: `Uma conversa foi atribuída a você`
    })

    // Dispatch webhook
    const conv = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: { contact: true }
    })
    await dispatchWebhook('conversation_assigned', { conversation: conv, assignedTo: assignment.user })

    return NextResponse.json({ success: true, data: assignment })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
