// app/api/bulk-send/parse-csv/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { parseCsvContacts } from '@/services/bulk-send'

export async function POST(req: NextRequest) {
  try {
    await requireAuth(['MANAGER', 'ADMIN'])
    const { csv } = await req.json()
    if (!csv) return NextResponse.json({ success: false, error: 'CSV vazio' }, { status: 400 })
    const contacts = await parseCsvContacts(csv)
    return NextResponse.json({ success: true, data: contacts })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro ao processar CSV' }, { status: 500 })
  }
}
