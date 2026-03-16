import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { runCampaign, pauseCampaign } from '@/services/bulk-send'

// POST /api/bulk-send/[id]/run
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(['MANAGER', 'ADMIN'])

    // Run async without blocking the response
    runCampaign(params.id).catch(err => {
      console.error(`[BulkSend] Campaign ${params.id} failed:`, err)
    })

    return NextResponse.json({ success: true, message: 'Campanha iniciada' })
  } catch (err) {
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
