import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth(['ADMIN'])
    const config = await prisma.botConfig.findFirst({
      include: { flows: { orderBy: { order: 'asc' } } }
    })
    return NextResponse.json({ success: true, data: config })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(['ADMIN'])
    const body = await req.json()
    const { name, isActive, welcomeMsg, fallbackMsg, transferMsg,
      autoTransfer, transferDelay, aiEnabled, aiPrompt, flows } = body

    // Delete existing and recreate (simpler for single-bot setup)
    await prisma.botConfig.deleteMany({})

    const config = await prisma.botConfig.create({
      data: {
        name: name || 'Bot Principal',
        isActive: isActive ?? false,
        welcomeMsg, fallbackMsg, transferMsg,
        autoTransfer: autoTransfer ?? true,
        transferDelay: transferDelay ?? 60,
        aiEnabled: aiEnabled ?? false,
        aiPrompt,
        flows: {
          createMany: {
            data: (flows || []).map((f: { trigger: string; response: string; action?: string; actionData?: string; order?: number }) => ({
              trigger: f.trigger,
              response: f.response,
              action: f.action || null,
              actionData: f.actionData || null,
              order: f.order || 0
            }))
          }
        }
      },
      include: { flows: { orderBy: { order: 'asc' } } }
    })

    return NextResponse.json({ success: true, data: config })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
