import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(['MANAGER', 'ADMIN'])
    const body = await req.json()
    const tag = await prisma.tag.update({
      where: { id: params.id },
      data: { name: body.name, color: body.color }
    })
    return NextResponse.json({ success: true, data: tag })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(['MANAGER', 'ADMIN'])
    await prisma.tag.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
