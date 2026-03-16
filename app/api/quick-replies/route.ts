import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await requireAuth()
    const quickReplies = await prisma.quickReply.findMany({
      where: {
        OR: [
          { userId: null },       // Global replies
          { userId: session.userId } // My replies
        ]
      },
      orderBy: { title: 'asc' }
    })
    return NextResponse.json({ success: true, data: quickReplies })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const { title, content, shortcut, isGlobal } = await req.json()
    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'Título e conteúdo obrigatórios' }, { status: 400 })
    }

    const qr = await prisma.quickReply.create({
      data: {
        title,
        content,
        shortcut: shortcut || null,
        userId: isGlobal && session.role !== 'AGENT' ? null : session.userId
      }
    })
    return NextResponse.json({ success: true, data: qr }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
