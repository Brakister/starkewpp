import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, hashPassword } from '@/lib/auth'
import { z } from 'zod'

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['AGENT', 'MANAGER', 'ADMIN']).default('AGENT'),
})

export async function GET(req: NextRequest) {
  try {
    await requireAuth(['MANAGER', 'ADMIN'])
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true, name: true, email: true, role: true,
          avatar: true, status: true, lastSeenAt: true,
          isActive: true, createdAt: true, updatedAt: true,
          teams: { include: { team: { select: { id: true, name: true, color: true } } } }
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.user.count()
    ])

    return NextResponse.json({ success: true, data: { items, total } })
  } catch (err) {
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(['ADMIN'])
    const body = await req.json()
    const data = createUserSchema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'E-mail já cadastrado' }, { status: 409 })
    }

    const user = await prisma.user.create({
      data: { ...data, password: await hashPassword(data.password) },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }
    })

    return NextResponse.json({ success: true, data: user }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Dados inválidos' }, { status: 400 })
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
