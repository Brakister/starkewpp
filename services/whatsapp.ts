/**
 * WhatsApp Cloud API Service
 * Handles all communication with Meta's WhatsApp Business API
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import axios, { AxiosInstance } from 'axios'
import { prisma } from '@/lib/prisma'

const WA_API_VERSION = 'v19.0'
const WA_BASE_URL = `https://graph.facebook.com/${WA_API_VERSION}`

interface WATextMessage {
  to: string
  text: string
  previewUrl?: boolean
}

interface WAMediaMessage {
  to: string
  type: 'image' | 'audio' | 'video' | 'document'
  mediaId?: string
  mediaUrl?: string
  caption?: string
  filename?: string
}

interface WATemplateMessage {
  to: string
  templateName: string
  languageCode: string
  components?: unknown[]
}

interface WAWebhookEntry {
  id: string
  changes: Array<{
    value: {
      messaging_product: string
      metadata: { display_phone_number: string; phone_number_id: string }
      contacts?: Array<{ profile: { name: string }; wa_id: string }>
      messages?: WAIncomingMessage[]
      statuses?: WAMessageStatus[]
    }
    field: string
  }>
}

export interface WAIncomingMessage {
  id: string
  from: string
  timestamp: string
  type: string
  text?: { body: string }
  image?: { id: string; mime_type: string; sha256: string; caption?: string }
  audio?: { id: string; mime_type: string; sha256: string; voice?: boolean }
  video?: { id: string; mime_type: string; sha256: string; caption?: string }
  document?: { id: string; mime_type: string; sha256: string; filename?: string; caption?: string }
  sticker?: { id: string; mime_type: string; sha256: string; animated?: boolean }
  location?: { latitude: number; longitude: number; name?: string; address?: string }
  button?: { text: string; payload: string }
  interactive?: {
    type: string
    list_reply?: { id: string; title: string }
    button_reply?: { id: string; title: string }
  }
}

interface WAMessageStatus {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
  errors?: Array<{ code: number; title: string }>
}

class WhatsAppService {
  private client: AxiosInstance
  private phoneNumberId: string
  private accessToken: string

  constructor(phoneNumberId: string, accessToken: string) {
    this.phoneNumberId = phoneNumberId
    this.accessToken = accessToken

    this.client = axios.create({
      baseURL: `${WA_BASE_URL}/${phoneNumberId}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
  }

  // ─── SEND MESSAGES ──────────────────────────────────────────────────────────

  async sendText({ to, text, previewUrl = false }: WATextMessage) {
    const response = await this.client.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhone(to),
      type: 'text',
      text: { body: text, preview_url: previewUrl }
    })
    return response.data
  }

  async sendMedia({ to, type, mediaId, mediaUrl, caption, filename }: WAMediaMessage) {
    const mediaPayload: Record<string, unknown> = {}
    if (mediaId) mediaPayload.id = mediaId
    if (mediaUrl) mediaPayload.link = mediaUrl
    if (caption) mediaPayload.caption = caption
    if (filename) mediaPayload.filename = filename

    const response = await this.client.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhone(to),
      type,
      [type]: mediaPayload
    })
    return response.data
  }

  async sendTemplate({ to, templateName, languageCode, components }: WATemplateMessage) {
    const response = await this.client.post('/messages', {
      messaging_product: 'whatsapp',
      to: this.normalizePhone(to),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components || []
      }
    })
    return response.data
  }

  async markAsRead(messageId: string) {
    await this.client.post('/messages', {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId
    })
  }

  async uploadMedia(buffer: Buffer, mimeType: string): Promise<string> {
    const formData = new FormData()
    formData.append('file', new Blob([buffer], { type: mimeType }))
    formData.append('type', mimeType)
    formData.append('messaging_product', 'whatsapp')

    const response = await this.client.post('/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data.id
  }

  async getMediaUrl(mediaId: string): Promise<string> {
    const response = await axios.get(`${WA_BASE_URL}/${mediaId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    })
    return response.data.url
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  private normalizePhone(phone: string): string {
    // Strip non-numeric chars and ensure starts with country code
    return phone.replace(/\D/g, '')
  }

  // ─── WEBHOOK PROCESSING ─────────────────────────────────────────────────────

  /**
   * Process incoming webhook payload from WhatsApp Cloud API
   * Called from the webhook route handler
   */
  static async processWebhook(body: { object: string; entry: WAWebhookEntry[] }) {
    if (body.object !== 'whatsapp_business_account') return

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue

        const value = change.value
        const phoneNumberId = value.metadata.phone_number_id

        // Handle incoming messages
        if (value.messages) {
          for (const msg of value.messages) {
            await WhatsAppService.handleIncomingMessage(msg, value.contacts?.[0], phoneNumberId)
          }
        }

        // Handle message status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            await WhatsAppService.handleStatusUpdate(status)
          }
        }
      }
    }
  }

  private static async handleIncomingMessage(
    msg: WAIncomingMessage,
    contact: { profile: { name: string }; wa_id: string } | undefined,
    phoneNumberId: string
  ) {
    const phone = msg.from
    const contactName = contact?.profile?.name

    // Upsert contact
    const dbContact = await prisma.contact.upsert({
      where: { phone },
      create: { phone, name: contactName },
      update: contactName ? { name: contactName } : {}
    })

    // Find or create open conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        contactId: dbContact.id,
        status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] }
      },
      orderBy: { updatedAt: 'desc' }
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          contactId: dbContact.id,
          status: 'OPEN'
        }
      })

      // Trigger bot welcome if configured
      await WhatsAppService.triggerBotResponse(conversation.id, phone, msg)
    }

    // Parse message content and type
    const { content, type, mediaUrl } = WhatsAppService.parseMessage(msg)

    // Save message to DB
    const savedMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'CONTACT',
        type,
        content,
        mediaUrl,
        whatsappId: msg.id,
        status: 'DELIVERED'
      }
    })

    // Update conversation's last message info
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: content.substring(0, 100),
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 }
      }
    })

    // Emit to Socket.io (imported dynamically to avoid circular deps)
    const { emitToRoom } = await import('@/services/socket')
    emitToRoom('conversations', 'new_message', {
      conversationId: conversation.id,
      message: savedMsg,
      contactId: dbContact.id
    })

    // Trigger outbound webhooks
    const { dispatchWebhook } = await import('@/services/webhook-dispatcher')
    await dispatchWebhook('new_message', {
      message: savedMsg,
      conversation,
      contact: dbContact
    })

    return savedMsg
  }

  private static async handleStatusUpdate(status: WAMessageStatus) {
    const statusMap: Record<string, string> = {
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED'
    }

    await prisma.message.updateMany({
      where: { whatsappId: status.id },
      data: {
        status: (statusMap[status.status] || 'SENT') as 'SENT',
        readAt: status.status === 'read' ? new Date() : undefined
      }
    })
  }

  private static parseMessage(msg: WAIncomingMessage): {
    content: string
    type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'STICKER' | 'LOCATION'
    mediaUrl?: string
  } {
    switch (msg.type) {
      case 'text':
        return { content: msg.text?.body || '', type: 'TEXT' }
      case 'image':
        return { content: msg.image?.caption || '[Imagem]', type: 'IMAGE', mediaUrl: msg.image?.id }
      case 'audio':
        return { content: '[Áudio]', type: 'AUDIO', mediaUrl: msg.audio?.id }
      case 'video':
        return { content: msg.video?.caption || '[Vídeo]', type: 'VIDEO', mediaUrl: msg.video?.id }
      case 'document':
        return { content: msg.document?.filename || '[Documento]', type: 'DOCUMENT', mediaUrl: msg.document?.id }
      case 'sticker':
        return { content: '[Sticker]', type: 'STICKER', mediaUrl: msg.sticker?.id }
      case 'location':
        return {
          content: `[Localização] ${msg.location?.name || ''} ${msg.location?.address || ''}`.trim(),
          type: 'LOCATION'
        }
      default:
        return { content: '[Mensagem não suportada]', type: 'TEXT' }
    }
  }

  private static async triggerBotResponse(
    conversationId: string,
    phone: string,
    msg: WAIncomingMessage
  ) {
    const botConfig = await prisma.botConfig.findFirst({
      where: { isActive: true },
      include: { flows: { orderBy: { order: 'asc' } } }
    })

    if (!botConfig) return

    const waConfig = await prisma.whatsAppConfig.findFirst({ where: { isActive: true } })
    if (!waConfig) return

    const service = new WhatsAppService(waConfig.phoneNumberId, waConfig.accessToken)
    const messageText = msg.text?.body?.toLowerCase() || ''

    // Check bot flows for matching trigger
    let response = botConfig.welcomeMsg
    for (const flow of botConfig.flows) {
      try {
        const regex = new RegExp(flow.trigger, 'i')
        if (regex.test(messageText)) {
          response = flow.response
          break
        }
      } catch {
        if (messageText.includes(flow.trigger.toLowerCase())) {
          response = flow.response
          break
        }
      }
    }

    if (response) {
      await service.sendText({ to: phone, text: response })
      await prisma.message.create({
        data: {
          conversationId,
          senderType: 'BOT',
          type: 'TEXT',
          content: response,
          isBot: true,
          status: 'SENT'
        }
      })
    }
  }
}

// ─── FACTORY ─────────────────────────────────────────────────────────────────

export async function getWhatsAppService(): Promise<WhatsAppService | null> {
  const config = await prisma.whatsAppConfig.findFirst({ where: { isActive: true } })
  if (!config) return null
  return new WhatsAppService(config.phoneNumberId, config.accessToken)
}

export { WhatsAppService }
