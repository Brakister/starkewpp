import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
      include: { tags: { include: { tag: true } } }
    })
    return NextResponse.json({ success: true, data: contact })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    const body = await req.json()
    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: body,
      include: { tags: { include: { tag: true } } }
    })
    return NextResponse.json({ success: true, data: contact })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(['MANAGER', 'ADMIN'])
    await prisma.contact.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
