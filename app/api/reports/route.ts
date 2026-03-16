import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(['MANAGER', 'ADMIN'])

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')
    const from = startOfDay(subDays(new Date(), days))
    const to = endOfDay(new Date())

    // ─── OVERVIEW STATS ──────────────────────────────────────────────────────

    const [totalConversations, closedConversations, totalMessages] = await Promise.all([
      prisma.conversation.count({
        where: { createdAt: { gte: from, lte: to } }
      }),
      prisma.conversation.count({
        where: { status: 'CLOSED', closedAt: { gte: from, lte: to } }
      }),
      prisma.message.count({
        where: { createdAt: { gte: from, lte: to }, senderType: 'AGENT' }
      })
    ])

    // ─── AGENT RANKING ───────────────────────────────────────────────────────

    const agentStats = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        avatar: true,
        messages: {
          where: { createdAt: { gte: from, lte: to }, senderType: 'AGENT' },
          select: { id: true }
        },
        conversations: {
          where: { isActive: true },
          select: {
            conversation: {
              select: {
                status: true,
                closedAt: true,
                createdAt: true
              }
            }
          }
        }
      }
    })

    const agentRanking = agentStats
      .map(agent => ({
        userId: agent.id,
        name: agent.name,
        avatar: agent.avatar,
        messagesSent: agent.messages.length,
        closedConversations: agent.conversations.filter(
          c => c.conversation.status === 'CLOSED'
        ).length,
        avgResponseTime: 0 // Simplified - in production, calculate from message timestamps
      }))
      .sort((a, b) => b.closedConversations - a.closedConversations)

    // ─── TEAM STATS ──────────────────────────────────────────────────────────

    const teams = await prisma.team.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        color: true,
        _count: {
          select: {
            conversations: true
          }
        }
      }
    })

    const teamStats = teams.map(t => ({
      teamId: t.id,
      teamName: t.name,
      color: t.color,
      conversations: t._count.conversations
    }))

    // ─── CONVERSATIONS BY DAY ─────────────────────────────────────────────────

    const conversationsByDay: Array<{ date: string; count: number }> = []
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = startOfDay(subDays(new Date(), i))
      const dayEnd = endOfDay(subDays(new Date(), i))
      const count = await prisma.conversation.count({
        where: { createdAt: { gte: dayStart, lte: dayEnd } }
      })
      conversationsByDay.push({
        date: format(dayStart, 'yyyy-MM-dd'),
        count
      })
    }

    // ─── STATUS DISTRIBUTION ─────────────────────────────────────────────────

    const statusDistribution = await prisma.conversation.groupBy({
      by: ['status'],
      _count: { status: true },
      where: { createdAt: { gte: from, lte: to } }
    })

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalConversations,
          closedConversations,
          totalMessages,
          resolutionRate: totalConversations > 0
            ? Math.round((closedConversations / totalConversations) * 100)
            : 0
        },
        agentRanking,
        teamStats,
        conversationsByDay,
        statusDistribution: statusDistribution.map(s => ({
          status: s.status,
          count: s._count.status
        }))
      }
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
    }
    console.error('[Reports/GET]', err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
