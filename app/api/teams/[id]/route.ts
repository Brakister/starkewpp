import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(['MANAGER', 'ADMIN'])
    const body = await req.json()
    const team = await prisma.team.update({
      where: { id: params.id },
      data: body,
      include: { members: { include: { user: { select: { id: true, name: true, avatar: true, status: true } } } } }
    })
    return NextResponse.json({ success: true, data: team })
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
    await prisma.team.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
