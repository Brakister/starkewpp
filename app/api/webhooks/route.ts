import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await requireAuth()
    const webhooks = await prisma.webhook.findMany({
      where: session.role === 'ADMIN' ? {} : { userId: session.userId },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, event: true, success: true, statusCode: true, createdAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Parse events JSON
    const parsed = webhooks.map(wh => ({
      ...wh,
      events: JSON.parse(wh.events) as string[]
    }))

    return NextResponse.json({ success: true, data: parsed })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await req.json()
    const { name, url, secret, events } = body

    if (!name || !url || !events?.length) {
      return NextResponse.json({ success: false, error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const webhook = await prisma.webhook.create({
      data: {
        name,
        url,
        secret: secret || null,
        events: JSON.stringify(events),
        userId: session.userId
      }
    })

    return NextResponse.json({
      success: true,
      data: { ...webhook, events: JSON.parse(webhook.events), logs: [] }
    }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
