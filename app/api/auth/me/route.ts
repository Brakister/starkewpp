import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true, name: true, email: true, role: true,
        avatar: true, status: true, isActive: true,
        teams: {
          include: { team: { select: { id: true, name: true, color: true } } }
        }
      }
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, error: 'Usuário inativo' }, { status: 401 })
    }

    return NextResponse.json({ success: true, data: { ...user, token: session.token } })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
