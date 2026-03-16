import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import type { ConversationStatus } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)

    const status = searchParams.get('status') as ConversationStatus | null
    const teamId = searchParams.get('teamId')
    const agentId = searchParams.get('agentId')
    const tagId = searchParams.get('tagId')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '30')

    // Build where clause
    const where: Record<string, unknown> = {}

    if (status && status !== 'ALL' as ConversationStatus) {
      where.status = status
    }
    if (teamId) where.teamId = teamId
    if (agentId) {
      where.assignments = {
        some: { userId: agentId, isActive: true }
      }
    }
    if (tagId) {
      where.tags = { some: { tagId } }
    }
    if (search) {
      where.OR = [
        { contact: { name: { contains: search } } },
        { contact: { phone: { contains: search } } },
        { lastMessage: { contains: search } }
      ]
    }

    // Agents see only non-private or their own conversations
    if (session.role === 'AGENT') {
      where.OR = [
        { isPrivate: false },
        { assignments: { some: { userId: session.userId, isActive: true } } }
      ]
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          contact: { include: { tags: { include: { tag: true } } } },
          team: { select: { id: true, name: true, color: true } },
          assignments: {
            where: { isActive: true },
            include: { user: { select: { id: true, name: true, avatar: true, status: true } } }
          },
          tags: { include: { tag: true } },
          _count: { select: { messages: true } }
        },
        orderBy: [
          { unreadCount: 'desc' },
          { lastMessageAt: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.conversation.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        items: conversations,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }
    console.error('[Conversations/GET]', err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await req.json()

    const { contactId, teamId, subject, isPrivate } = body

    const conversation = await prisma.conversation.create({
      data: {
        contactId,
        teamId,
        subject,
        isPrivate: isPrivate || false,
        status: 'OPEN',
        assignments: {
          create: { userId: session.userId }
        }
      },
      include: {
        contact: true,
        team: true,
        assignments: { include: { user: true } }
      }
    })

    return NextResponse.json({ success: true, data: conversation }, { status: 201 })
  } catch (err) {
    console.error('[Conversations/POST]', err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
