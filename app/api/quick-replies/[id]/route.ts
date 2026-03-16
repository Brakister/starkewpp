import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const body = await req.json()

    // Only owner or admin can edit
    const existing = await prisma.quickReply.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })
    if (existing.userId && existing.userId !== session.userId && session.role === 'AGENT') {
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
    }

    const reply = await prisma.quickReply.update({
      where: { id: params.id },
      data: {
        title: body.title,
        content: body.content,
        shortcut: body.shortcut || null,
        userId: body.isGlobal && session.role !== 'AGENT' ? null : session.userId,
      }
    })
    return NextResponse.json({ success: true, data: reply })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const existing = await prisma.quickReply.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })
    if (existing.userId && existing.userId !== session.userId && session.role === 'AGENT') {
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
    }
    await prisma.quickReply.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
