import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, hashPassword } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(['ADMIN'])
    const body = await req.json()
    const { name, role, isActive, password } = body

    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name
    if (role) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive
    if (password) updateData.password = await hashPassword(password)

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true, status: true, createdAt: true, updatedAt: true }
    })

    return NextResponse.json({ success: true, data: user })
  } catch (err) {
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(['ADMIN'])

    // Prevent self-deletion
    if (params.id === session.userId) {
      return NextResponse.json({ success: false, error: 'Não é possível excluir sua própria conta' }, { status: 400 })
    }

    await prisma.user.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
