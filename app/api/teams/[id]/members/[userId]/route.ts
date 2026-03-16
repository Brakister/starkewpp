import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// DELETE /api/teams/[id]/members/[userId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    await requireAuth(['MANAGER', 'ADMIN'])
    await prisma.teamMember.deleteMany({
      where: { teamId: params.id, userId: params.userId }
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
