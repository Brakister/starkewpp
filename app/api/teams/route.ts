import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth()
    const teams = await prisma.team.findMany({
      where: { isActive: true },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatar: true, status: true } } }
        },
        _count: { select: { conversations: true } }
      },
      orderBy: { name: 'asc' }
    })
    return NextResponse.json({ success: true, data: teams })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(['MANAGER', 'ADMIN'])
    const body = await req.json()
    const { name, description, color } = body

    if (!name) return NextResponse.json({ success: false, error: 'Nome obrigatório' }, { status: 400 })

    const team = await prisma.team.create({
      data: { name, description, color: color || '#10b981' },
      include: { members: true }
    })
    return NextResponse.json({ success: true, data: team }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
