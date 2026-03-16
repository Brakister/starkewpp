/**
 * Webhook Dispatcher Service
 * Fires outgoing webhooks to external systems on platform events
 */

import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export type WebhookEvent =
  | 'new_message'
  | 'conversation_started'
  | 'conversation_closed'
  | 'conversation_assigned'
  | 'contact_assigned'

export async function dispatchWebhook(event: WebhookEvent, payload: unknown) {
  // Find all active webhooks subscribed to this event
  const webhooks = await prisma.webhook.findMany({
    where: { isActive: true }
  })

  const subscribed = webhooks.filter(wh => {
    try {
      const events = JSON.parse(wh.events) as string[]
      return events.includes(event) || events.includes('*')
    } catch {
      return false
    }
  })

  // Fire all webhooks in parallel (non-blocking)
  await Promise.allSettled(subscribed.map(wh => fireWebhook(wh, event, payload)))
}

async function fireWebhook(
  webhook: { id: string; url: string; secret?: string | null },
  event: WebhookEvent,
  payload: unknown
) {
  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload
  })

  // HMAC signature for security verification
  const signature = webhook.secret
    ? crypto.createHmac('sha256', webhook.secret).update(body).digest('hex')
    : undefined

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-ZapFlow-Event': event,
    'X-ZapFlow-Timestamp': Date.now().toString()
  }
  if (signature) headers['X-ZapFlow-Signature'] = `sha256=${signature}`

  let statusCode: number | undefined
  let responseText: string | undefined
  let success = false

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10_000) // 10s timeout
    })
    statusCode = response.status
    responseText = await response.text().catch(() => '')
    success = response.ok
  } catch (err) {
    responseText = err instanceof Error ? err.message : 'Unknown error'
  }

  // Log the attempt
  await prisma.webhookLog.create({
    data: {
      webhookId: webhook.id,
      event,
      payload: body,
      statusCode,
      response: responseText,
      success
    }
  })
}
