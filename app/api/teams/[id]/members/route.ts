import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// POST /api/teams/[id]/members
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(['MANAGER', 'ADMIN'])
    const { userId } = await req.json()

    const member = await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: params.id, userId } },
      create: { teamId: params.id, userId },
      update: {},
      include: { user: { select: { id: true, name: true, avatar: true, status: true } } }
    })

    return NextResponse.json({ success: true, data: member }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
