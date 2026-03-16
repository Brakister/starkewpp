import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getSuggestedReplies, classifyConversation } from '@/services/ai'
import { prisma } from '@/lib/prisma'

// GET /api/ai/suggestions?conversationId=xxx
export async function GET(req: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')
    if (!conversationId) {
      return NextResponse.json({ success: false, error: 'conversationId required' }, { status: 400 })
    }

    const messages = await prisma.message.findMany({
      where: { conversationId, senderType: 'CONTACT' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { content: true },
    })

    if (messages.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const lastMessage = messages[0].content
    const context = messages.map(m => m.content).reverse().join(' | ')

    const suggestions = await getSuggestedReplies(lastMessage, context)
    return NextResponse.json({ success: true, data: suggestions })
  } catch (err) {
    console.error('[AI/suggestions]', err)
    return NextResponse.json({ success: true, data: [] }) // graceful fallback
  }
}

// POST /api/ai/classify
export async function POST(req: NextRequest) {
  try {
    await requireAuth()
    const { conversationId } = await req.json()
    if (!conversationId) {
      return NextResponse.json({ success: false, error: 'conversationId required' }, { status: 400 })
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 10,
      select: { content: true, senderType: true },
    })

    const msgTexts = messages.map(m =>
      `${m.senderType === 'CONTACT' ? 'Cliente' : 'Agente'}: ${m.content}`
    )

    const classification = await classifyConversation(msgTexts)
    return NextResponse.json({ success: true, data: classification })
  } catch (err) {
    console.error('[AI/classify]', err)
    return NextResponse.json({ success: false, error: 'Erro na classificação' }, { status: 500 })
  }
}
