/**
 * Bulk Send Service
 * Handles mass message campaigns with rate limiting
 * to reduce risk of WhatsApp blocking
 */

import { prisma } from '@/lib/prisma'
import { getWhatsAppService } from './whatsapp'

// WhatsApp Cloud API rate: ~80 messages/minute per number (conservative limit)
const MESSAGES_PER_BATCH = 10
const BATCH_DELAY_MS = 8_000 // 8 seconds between batches = ~75/min

export async function runCampaign(campaignId: string) {
  const campaign = await prisma.bulkCampaign.findUnique({
    where: { id: campaignId },
    include: { recipients: { where: { status: 'PENDING' } } }
  })

  if (!campaign) throw new Error('Campaign not found')
  if (campaign.status === 'RUNNING') throw new Error('Campaign already running')

  await prisma.bulkCampaign.update({
    where: { id: campaignId },
    data: { status: 'RUNNING', startedAt: new Date() }
  })

  const waService = await getWhatsAppService()
  if (!waService) {
    await prisma.bulkCampaign.update({
      where: { id: campaignId },
      data: { status: 'FAILED' }
    })
    throw new Error('WhatsApp not configured')
  }

  const recipients = campaign.recipients
  const batches = chunk(recipients, MESSAGES_PER_BATCH)

  let sentCount = 0
  let failedCount = 0

  for (const batch of batches) {
    // Check if campaign was paused/cancelled
    const current = await prisma.bulkCampaign.findUnique({ where: { id: campaignId } })
    if (current?.status === 'PAUSED') {
      console.log(`[BulkSend] Campaign ${campaignId} paused`)
      return
    }

    // Send batch
    await Promise.allSettled(
      batch.map(async (recipient) => {
        try {
          // Personalize message with recipient name
          const personalizedMsg = campaign.message
            .replace('{{name}}', recipient.name || 'Cliente')
            .replace('{{phone}}', recipient.phone)

          await waService.sendText({ to: recipient.phone, text: personalizedMsg })

          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: { status: 'SENT', sentAt: new Date() }
          })
          sentCount++
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Unknown error'
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: { status: 'FAILED', error }
          })
          failedCount++
        }
      })
    )

    // Update progress
    await prisma.bulkCampaign.update({
      where: { id: campaignId },
      data: { sentCount, failedCount }
    })

    // Wait between batches (rate limiting)
    if (batches.indexOf(batch) < batches.length - 1) {
      await sleep(BATCH_DELAY_MS)
    }
  }

  await prisma.bulkCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      sentCount,
      failedCount
    }
  })
}

export async function pauseCampaign(campaignId: string) {
  await prisma.bulkCampaign.update({
    where: { id: campaignId },
    data: { status: 'PAUSED' }
  })
}

export async function parseCsvContacts(csv: string): Promise<Array<{ phone: string; name?: string }>> {
  const lines = csv.trim().split('\n')
  if (lines.length === 0) return []

  // Detect header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const phoneIdx = headers.findIndex(h => ['phone', 'telefone', 'celular', 'numero'].includes(h))
  const nameIdx = headers.findIndex(h => ['name', 'nome'].includes(h))

  const startIdx = phoneIdx >= 0 ? 1 : 0 // skip header row if found

  const contacts: Array<{ phone: string; name?: string }> = []

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const phone = phoneIdx >= 0 ? cols[phoneIdx] : cols[0]
    const name = nameIdx >= 0 ? cols[nameIdx] : undefined

    if (phone) {
      contacts.push({
        phone: phone.replace(/\D/g, ''), // normalize
        name: name || undefined
      })
    }
  }

  return contacts
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
