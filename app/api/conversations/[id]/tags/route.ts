import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// POST /api/conversations/[id]/tags  — add tag
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    const { tagId } = await req.json()

    await prisma.conversationTag.upsert({
      where: { conversationId_tagId: { conversationId: params.id, tagId } },
      create: { conversationId: params.id, tagId },
      update: {}
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE /api/conversations/[id]/tags?tagId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    const { searchParams } = new URL(req.url)
    const tagId = searchParams.get('tagId')
    if (!tagId) return NextResponse.json({ success: false, error: 'tagId required' }, { status: 400 })

    await prisma.conversationTag.delete({
      where: { conversationId_tagId: { conversationId: params.id, tagId } }
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
