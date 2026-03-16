import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { pauseCampaign } from '@/services/bulk-send'

// POST /api/bulk-send/[id]/pause
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(['MANAGER', 'ADMIN'])
    await pauseCampaign(params.id)
    return NextResponse.json({ success: true, message: 'Campanha pausada' })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
