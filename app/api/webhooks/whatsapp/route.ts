import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppService } from '@/services/whatsapp'
import crypto from 'crypto'

/**
 * WhatsApp Cloud API Webhook
 * GET  - Webhook verification (required by Meta)
 * POST - Receive incoming messages and status updates
 */

// GET: Verify webhook during setup
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] WhatsApp webhook verified')
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST: Receive webhook events
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()

    // Verify signature
    const signature = req.headers.get('x-hub-signature-256')
    const appSecret = process.env.WHATSAPP_APP_SECRET

    if (appSecret && signature) {
      const expected = `sha256=${crypto
        .createHmac('sha256', appSecret)
        .update(body)
        .digest('hex')}`

      if (signature !== expected) {
        console.warn('[Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    const payload = JSON.parse(body)
    await WhatsAppService.processWebhook(payload)

    // WhatsApp expects 200 OK quickly
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[Webhook/POST]', err)
    // Always return 200 to prevent WhatsApp from retrying repeatedly
    return NextResponse.json({ status: 'ok' })
  }
}
