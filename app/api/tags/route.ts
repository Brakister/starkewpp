import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth()
    const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json({ success: true, data: tags })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(['MANAGER', 'ADMIN'])
    const { name, color } = await req.json()
    if (!name) return NextResponse.json({ success: false, error: 'Nome obrigatório' }, { status: 400 })

    const tag = await prisma.tag.upsert({
      where: { name },
      create: { name, color: color || '#10b981' },
      update: { color }
    })
    return NextResponse.json({ success: true, data: tag })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
