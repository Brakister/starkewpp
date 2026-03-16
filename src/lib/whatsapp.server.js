// Adaptado do wa-helpdesk que funcionava — padrão idêntico
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  isJidGroup,
  downloadMediaMessage,
} = require('@whiskeysockets/baileys')
const { Boom }         = require('@hapi/boom')
const { PrismaClient } = require('@prisma/client')
const pino             = require('pino')
const path             = require('path')
const fs               = require('fs')

const prisma      = new PrismaClient()
const SESSION_DIR = path.join(process.cwd(), '.baileys-auth')
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')

fs.mkdirSync(SESSION_DIR, { recursive: true })
fs.mkdirSync(UPLOADS_DIR, { recursive: true })

class WhatsAppService {
  constructor(io) {
    this.io         = io
    this.sock       = null
    this.qrCode     = null
    this.isReady    = false
    this.retryCount = 0
    this.maxRetries = 10
  }

  isConnected() { return this.isReady && !!this.sock }

  async connect() {
    try {
      const { version }         = await fetchLatestBaileysVersion()
      const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

      this.sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
      })

      this.sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if (qr) {
          try {
            const QRCode = require('qrcode')
            this.qrCode  = await QRCode.toDataURL(qr)
            this.isReady = false
            this.io.emit('wa:qr', { qr: this.qrCode })
            console.log('[WA] QR Code gerado! Acesse /settings/whatsapp')
          } catch (e) {
            console.error('[WA] Erro ao gerar QR:', e.message)
          }
        }

        if (connection === 'close') {
          this.isReady = false
          this.qrCode  = null
          this.io.emit('wa:disconnected', {})

          const code = lastDisconnect?.error instanceof Boom
            ? lastDisconnect.error.output?.statusCode
            : null
          console.log('[WA] Encerrado. Código:', code)

          if (code === DisconnectReason.loggedOut) {
            this.clearSession()
            setTimeout(() => this.connect(), 3000)
          } else if (this.retryCount < this.maxRetries) {
            this.retryCount++
            const delay = Math.min(3000 * this.retryCount, 30000)
            console.log(`[WA] Reconectando em ${delay/1000}s... (${this.retryCount}/${this.maxRetries})`)
            setTimeout(() => this.connect(), delay)
          }
        }

        if (connection === 'open') {
          this.isReady    = true
          this.retryCount = 0
          this.qrCode     = null
          console.log('[WA] ✅ Conectado! Número:', this.sock.user?.id)
          this.io.emit('wa:connected', { connected: true, phone: this.sock.user?.id?.split(':')[0] })
        }
      })

      this.sock.ev.on('creds.update', saveCreds)

      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return
        for (const msg of messages) {
          if (!msg.message) continue
          const jid = msg.key.remoteJid || ''
          if (isJidBroadcast(jid) || isJidGroup(jid)) continue
          try { await this.processMessage(msg) }
          catch (e) { console.error('[WA] Erro ao processar mensagem:', e.message) }
        }
      })

    } catch (e) {
      console.error('[WA] Erro de conexão:', e.message)
      if (this.retryCount < this.maxRetries) {
        this.retryCount++
        setTimeout(() => this.connect(), 5000)
      }
    }
  }

  normalizeJid(jid) {
    if (!jid) return jid
    const [user, server] = jid.split('@')
    const cleanUser      = user.split(':')[0]
    const cleanServer    = server === 'c.us' ? 's.whatsapp.net' : server
    return `${cleanUser}@${cleanServer}`
  }

  async processMessage(msg) {
    const fromMe   = msg.key.fromMe === true
    const jid      = this.normalizeJid(msg.key.remoteJid)
    const phone    = jid.replace('@s.whatsapp.net', '').replace(/\D/g, '')
    const pushName = fromMe ? null : (msg.pushName || phone)

    // Busca ou cria contato
    let contact = await prisma.contact.findUnique({ where: { phone } })
    if (!contact) {
      contact = await prisma.contact.create({
        data: { phone, name: pushName || phone }
      })
    } else if (pushName && contact.name === phone) {
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data:  { name: pushName }
      })
    }

    // Busca ou cria conversa aberta
    let conversation = await prisma.conversation.findFirst({
      where: {
        contactId: contact.id,
        status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] }
      },
      orderBy: { updatedAt: 'desc' }
    })

    const isNew = !conversation
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { contactId: contact.id, status: 'OPEN' }
      })
    }

    // Dedup por whatsappId
    if (msg.key.id) {
      const dup = await prisma.message.findFirst({ where: { whatsappId: msg.key.id } })
      if (dup) return
    }

    const { type, content, fileData } = await this.parseAndDownload(msg)

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        whatsappId:     msg.key.id || null,
        senderType:     fromMe ? 'AGENT' : 'CONTACT',
        type:           type.toUpperCase(),
        content:        content || '',
        mediaUrl:       fileData?.url || null,
        status:         'DELIVERED',
        isBot:          false,
        isPrivate:      false,
      }
    })

    const preview   = this.preview(type, content, fileData?.name)
    const unread    = fromMe ? conversation.unreadCount : conversation.unreadCount + 1

    await prisma.conversation.update({
      where: { id: conversation.id },
      data:  { lastMessage: preview, lastMessageAt: new Date(), unreadCount: unread }
    })

    // Emite via Socket.io para todos os atendentes
    if (isNew) {
      this.io.emit('conversation:new', {
        conversationId: conversation.id, contactId: contact.id
      })
    } else {
      this.io.emit('conversation:updated', {
        conversationId: conversation.id,
        lastMessage:    preview,
        lastMessageAt:  new Date().toISOString(),
        unreadCount:    unread,
      })
      this.io.emit('conversation_update', { conversationId: conversation.id })
    }
    // emite nos dois formatos para compatibilidade com o frontend
    this.io.emit('message:new', { conversationId: conversation.id, message })
    this.io.emit('new_message', { conversationId: conversation.id, message })
  }

  preview(type, content, fileName) {
    if (type === 'text') return content || ''
    const m = {
      image:    '📷 Imagem',
      audio:    '🎵 Áudio',
      video:    '🎬 Vídeo',
      document: `📄 ${fileName || 'Documento'}`,
      sticker:  '🎴 Sticker',
      location: '📍 Localização',
    }
    return m[type] || '[mídia]'
  }

  async parseAndDownload(msg) {
    const m = msg.message
    if (!m) return { type: 'text', content: '[vazio]' }

    const inner = m.ephemeralMessage?.message
      || m.viewOnceMessage?.message
      || m.viewOnceMessageV2?.message?.viewOnceMessage?.message
      || m

    if (inner.conversation)         return { type: 'text', content: inner.conversation }
    if (inner.extendedTextMessage)  return { type: 'text', content: inner.extendedTextMessage.text }

    const mediaMap = {
      imageMessage:    { type: 'image',    ext: 'jpg'  },
      audioMessage:    { type: 'audio',    ext: 'ogg'  },
      videoMessage:    { type: 'video',    ext: 'mp4'  },
      documentMessage: { type: 'document', ext: null   },
      stickerMessage:  { type: 'sticker',  ext: 'webp' },
    }

    for (const [key, meta] of Object.entries(mediaMap)) {
      if (!inner[key]) continue
      const mediaObj = inner[key]
      const caption  = mediaObj.caption || null
      const docName  = key === 'documentMessage' ? (mediaObj.fileName || 'documento') : null
      const ext      = meta.ext || (docName?.split('.').pop() || 'bin')
      const mime     = mediaObj.mimetype || 'application/octet-stream'

      try {
        const buffer = await downloadMediaMessage(msg, 'buffer', {},
          { logger: pino({ level: 'silent' }), reuploadRequest: this.sock.updateMediaMessage }
        )
        if (buffer?.length > 0) {
          const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
          fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer)
          return {
            type: meta.type, content: caption,
            fileData: { url: `/uploads/${filename}`, name: docName || filename, size: buffer.length, mime }
          }
        }
      } catch (e) {
        console.warn(`[WA] Download de mídia falhou (${key}):`, e.message)
      }

      return { type: meta.type, content: caption || docName || null }
    }

    if (inner.locationMessage) return {
      type: 'location',
      content: `${inner.locationMessage.degreesLatitude},${inner.locationMessage.degreesLongitude}`
    }
    if (inner.reactionMessage) return { type: 'text', content: `${inner.reactionMessage.text || '👍'} (reação)` }
    if (inner.protocolMessage) return { type: 'text', content: '🗑️ [mensagem apagada]' }

    return { type: 'text', content: '[tipo não suportado]' }
  }

  async sendMessage(jid, { type, content, filePath, mimeType, fileName }) {
    if (!this.isConnected()) throw new Error('WhatsApp não conectado')

    if (type === 'text' && content) {
      await this.sock.sendMessage(jid, { text: content })
    } else if (type === 'image' && filePath) {
      await this.sock.sendMessage(jid, {
        image: fs.readFileSync(filePath), caption: content || '',
        mimetype: mimeType || 'image/jpeg'
      })
    } else if (type === 'audio' && filePath) {
      await this.sock.sendMessage(jid, {
        audio: fs.readFileSync(filePath),
        mimetype: mimeType || 'audio/mpeg', ptt: false
      })
    } else if (type === 'document' && filePath) {
      await this.sock.sendMessage(jid, {
        document: fs.readFileSync(filePath),
        mimetype: mimeType || 'application/octet-stream',
        fileName: fileName || 'arquivo'
      })
    } else if (content) {
      await this.sock.sendMessage(jid, { text: content })
    }
  }

  clearSession() {
    if (fs.existsSync(SESSION_DIR)) fs.rmSync(SESSION_DIR, { recursive: true, force: true })
    fs.mkdirSync(SESSION_DIR, { recursive: true })
    console.log('[WA] Sessão limpa')
  }

  getQR()     { return this.qrCode }
  getStatus() { return { connected: this.isReady, hasQR: !!this.qrCode } }

  async logout() {
    try { if (this.sock) await this.sock.logout() } catch {}
    this.clearSession()
    this.isReady = false
    this.sock    = null
    this.io.emit('wa:disconnected', {})
  }
}

module.exports = { WhatsAppService }
