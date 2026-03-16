import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

// GET — status atual + QR code se disponível
export async function GET() {
  try {
    await requireAuth(['ADMIN'])
    const wa = (global as any)._waService
    if (!wa) return NextResponse.json({ success: true, data: { status: 'disconnected', qrCode: null } })

    const { connected, hasQR } = wa.getStatus()
    return NextResponse.json({
      success: true,
      data: {
        status:  connected ? 'connected' : hasQR ? 'qr_ready' : 'connecting',
        qrCode:  wa.getQR(),
      }
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

// POST — ações: connect | disconnect | clear
export async function POST(req: NextRequest) {
  try {
    await requireAuth(['ADMIN'])
    const { action } = await req.json()
    const wa = (global as any)._waService

    if (action === 'connect') {
      if (!wa) return NextResponse.json({ success: false, error: 'Serviço não iniciado' }, { status: 503 })
      wa.connect()
      return NextResponse.json({ success: true, message: 'Conectando...' })
    }

    if (action === 'disconnect') {
      if (wa) await wa.logout()
      return NextResponse.json({ success: true, message: 'Desconectado' })
    }

    if (action === 'clear') {
      if (wa) { wa.clearSession(); wa.connect() }
      return NextResponse.json({ success: true, message: 'Sessão limpa, reconectando...' })
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
