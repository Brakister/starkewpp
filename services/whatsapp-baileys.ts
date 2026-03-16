/**
 * ZapFlow - WhatsApp via Baileys (QR Code)
 * Custo zero — funciona como WhatsApp Web
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  downloadMediaMessage,
  isJidBroadcast,
  isJidGroup,
  proto,
  WASocket,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { prisma } from '@/lib/prisma'
import { emitToRoom } from './socket'
import { dispatchWebhook } from './webhook-dispatcher'
import path from 'path'
import fs from 'fs'
import pino from 'pino'

const logger = pino({ level: 'silent' })
const AUTH_DIR = path.join(process.cwd(), '.baileys-auth')
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')

let sock: WASocket | null = null
let qrCode: string | null = null
let connectionStatus: 'disconnected' | 'connecting' | 'qr_ready' | 'connected' = 'disconnected'
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const MAX_RECONNECT = 5
let globalHandlersReady = false
const globalForWA = globalThis as unknown as {
  _waService?: {
    isConnected: () => boolean
    connect: () => Promise<void>
    logout: () => Promise<void>
    clearSession: () => void
    getStatus: () => { connected: boolean; hasQR: boolean }
    getQR: () => string | null
    sendMessage: (jid: string, payload: { type: string; content?: string; filePath?: string; mimeType?: string; fileName?: string }) => Promise<void>
  }
}

function setupGlobalHandlers() {
  if (globalHandlersReady) return
  globalHandlersReady = true

  process.on('unhandledRejection', (reason: unknown) => {
    console.error('[Baileys] unhandledRejection:', reason)
  })
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

export function getConnectionStatus() { return connectionStatus }
export function getQRCode() { return qrCode }

function notifyStatus(status: typeof connectionStatus) {
  if (connectionStatus === status) return
  connectionStatus = status
  emitToRoom('conversations', 'whatsapp_status', { status })
  const io = (globalThis as unknown as { io?: any }).io
  if (io) {
    if (status === 'connected') io.emit('wa:connected', { connected: true })
    if (status === 'disconnected') io.emit('wa:disconnected', {})
  }
}

// ─── CONNECT ──────────────────────────────────────────────────────────────────

export async function connectWhatsApp() {
  // Evita múltiplas conexões simultâneas
  if (sock || connectionStatus === 'connecting') return
  setupGlobalHandlers()

  notifyStatus('connecting')

  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

  let version: [number, number, number]
  try {
    const result = await fetchLatestBaileysVersion()
    version = result.version
    console.log(`[Baileys] Versão WA: ${version.join('.')}`)
  } catch {
    // Fallback para versão conhecida se não conseguir buscar
    version = [2, 3000, 1015901307]
    console.log('[Baileys] Usando versão fallback')
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

  sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    // printQRInTerminal REMOVIDO — estava causando crash na versão atual
    browser: ['ZapFlow', 'Chrome', '120.0'],
    generateHighQualityLinkPreview: false,
    syncFullHistory: true,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 30_000,
    retryRequestDelayMs: 5000,
  })

  // ─── QR CODE ────────────────────────────────────────────────────────────────

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    // Novo QR Code disponível
    if (qr) {
      console.log('[Baileys] QR Code gerado! Acesse /settings/whatsapp para escanear.')
      try {
        const QRCode = await import('qrcode')
        qrCode = await QRCode.toDataURL(qr, { width: 300, margin: 2 })
      } catch {
        qrCode = qr // fallback: string bruta
      }
      notifyStatus('qr_ready')
      const io = (globalThis as unknown as { io?: any }).io
      if (io) io.emit('wa:qr', { qr: qrCode })
      // Emite o QR via Socket.io para a página de configurações
      emitToRoom('conversations', 'whatsapp_qr', { qrCode })
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const isTimeout = statusCode === 408 || /Timed Out/i.test((lastDisconnect?.error as any)?.message || '')
      const loggedOut  = statusCode === DisconnectReason.loggedOut

      console.log(`[Baileys] Desconectado. Código: ${statusCode ?? 'sem código'}`)

      sock = null
      qrCode = null
      notifyStatus('disconnected')

      if (loggedOut) {
        console.log('[Baileys] Sessão encerrada pelo usuário. Limpando...')
        clearSession()
        return
      }

      // Tenta reconectar com backoff
      if (reconnectAttempts < MAX_RECONNECT) {
        reconnectAttempts++
        const baseDelay = isTimeout ? 8000 : 5000
        const delay = Math.min(reconnectAttempts * baseDelay, 30000)
        console.log(`[Baileys] Reconectando em ${delay / 1000}s... (${reconnectAttempts}/${MAX_RECONNECT})`)
        reconnectTimer = setTimeout(() => { connectWhatsApp() }, delay)
      } else {
        console.log('[Baileys] Máximo de tentativas atingido. Clique em Conectar manualmente.')
        reconnectAttempts = 0
      }
    }

    if (connection === 'open') {
      console.log('[Baileys] ✅ WhatsApp conectado com sucesso!')
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
      reconnectAttempts = 0
      qrCode = null
      notifyStatus('connected')

      const phone = sock?.user?.id?.split(':')[0] || 'baileys'
      const name  = sock?.user?.name || 'WhatsApp'

      await prisma.whatsAppConfig.upsert({
        where:  { phoneNumberId: phone },
        create: { phoneNumberId: phone, displayName: name, accessToken: 'baileys', isActive: true },
        update: { displayName: name, isActive: true },
      })

      // Notifica com número do telefone
      emitToRoom('conversations', 'whatsapp_status', { status: 'connected', phoneNumber: phone })
      const io = (globalThis as unknown as { io?: any }).io
      if (io) io.emit('wa:connected', { connected: true, phone: sock?.user?.id?.split(':')[0] })
    }
  })

  // ─── SALVA CREDENCIAIS ────────────────────────────────────────────────────

  sock.ev.on('creds.update', saveCreds)

  // ─── MENSAGENS RECEBIDAS ──────────────────────────────────────────────────

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      if (msg.key.fromMe) continue
      const jid = msg.key.remoteJid || ''
      if (isJidGroup(jid)) continue // ignora grupos
      if (isJidBroadcast(jid) || jid === 'status@broadcast') continue // ignora status/broadcast
      await handleIncomingMessage(msg, { source: 'live' }).catch(err =>
        console.error('[Baileys] Erro ao processar mensagem:', err)
      )
    }
  })

  // ─── HISTÓRICO (últimos 2 dias) ─────────────────────────────────────────
  sock.ev.on('messaging-history.set', async ({ messages }) => {
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000
    const cutoff = Date.now() - twoDaysMs
    for (const msg of messages) {
      const jid = msg.key.remoteJid || ''
      if (msg.key.fromMe) continue
      if (isJidGroup(jid)) continue
      if (isJidBroadcast(jid) || jid === 'status@broadcast') continue

      const ts = (msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : 0)
      if (ts && ts < cutoff) continue

      await handleIncomingMessage(msg, { source: 'history', skipRead: true, skipBot: true }).catch(err =>
        console.error('[Baileys] Erro ao processar histórico:', err)
      )
    }
  })

  // ─── STATUS DE LEITURA ────────────────────────────────────────────────────

  sock.ev.on('message-receipt.update', async (updates) => {
    for (const update of updates) {
      const status = update.receipt.readTimestamp ? 'READ' : 'DELIVERED'
      await prisma.message.updateMany({
        where: { whatsappId: update.key.id! },
        data:  { status },
      }).catch(() => {})
    }
  })

  return sock
}

// ─── DISCONNECT ───────────────────────────────────────────────────────────────

export async function disconnectWhatsApp() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  reconnectAttempts = MAX_RECONNECT // impede reconexão automática
  if (sock) {
    try { await sock.logout() } catch { sock?.end(undefined) }
    sock = null
  }
  clearSession()
  notifyStatus('disconnected')
}

export function clearSession() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true })
    }
    fs.mkdirSync(AUTH_DIR, { recursive: true })
  } catch (e) {
    console.error('[Baileys] Erro ao limpar sessão:', e)
  }
  qrCode = null
  sock = null
  reconnectAttempts = 0
  notifyStatus('disconnected')
}

// ─── ENVIO DE MENSAGENS ───────────────────────────────────────────────────────

export async function sendText(to: string, text: string): Promise<string | null> {
  if (!sock) throw new Error('WhatsApp não conectado')
  const result = await sock.sendMessage(toJID(to), { text })
  return result?.key.id ?? null
}

export async function sendImage(to: string, url: string, caption?: string): Promise<string | null> {
  if (!sock) throw new Error('WhatsApp não conectado')
  const result = await sock.sendMessage(toJID(to), { image: { url }, caption })
  return result?.key.id ?? null
}

export async function sendDocument(to: string, url: string, filename: string, mimetype = 'application/octet-stream'): Promise<string | null> {
  if (!sock) throw new Error('WhatsApp não conectado')
  const result = await sock.sendMessage(toJID(to), { document: { url }, fileName: filename, mimetype })
  return result?.key.id ?? null
}

export async function sendAudio(to: string, url: string): Promise<string | null> {
  if (!sock) throw new Error('WhatsApp não conectado')
  const result = await sock.sendMessage(toJID(to), { audio: { url }, mimetype: 'audio/mp4', ptt: true })
  return result?.key.id ?? null
}

export async function sendVideo(to: string, url: string, caption?: string): Promise<string | null> {
  if (!sock) throw new Error('WhatsApp não conectado')
  const result = await sock.sendMessage(toJID(to), { video: { url }, caption })
  return result?.key.id ?? null
}

export async function markAsRead(to: string, messageId: string) {
  if (!sock) return
  await sock.readMessages([{ remoteJid: toJID(to), id: messageId, fromMe: false }]).catch(() => {})
}

export async function sendTyping(to: string, typing: boolean) {
  if (!sock) return
  await sock.sendPresenceUpdate(typing ? 'composing' : 'paused', toJID(to)).catch(() => {})
}

function resolveLocalPath(filePath?: string) {
  if (!filePath) return null
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return null
  const normalized = filePath.startsWith('/uploads/')
    ? path.join(process.cwd(), 'public', filePath)
    : path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath)
  return fs.existsSync(normalized) ? normalized : null
}

async function sendViaAdapter(jid: string, payload: { type: string; content?: string; filePath?: string; mimeType?: string; fileName?: string }) {
  const type = payload.type.toLowerCase()
  const text = payload.content || ''
  const localPath = resolveLocalPath(payload.filePath)

  if (type === 'text') {
    await sendText(jid, text)
    return
  }

  if (type === 'image') {
    if (localPath) {
      await sock?.sendMessage(toJID(jid), { image: fs.readFileSync(localPath), caption: text })
    } else if (payload.filePath) {
      await sendImage(jid, payload.filePath, text)
    }
    return
  }

  if (type === 'audio') {
    if (localPath) {
      await sock?.sendMessage(toJID(jid), { audio: fs.readFileSync(localPath), mimetype: payload.mimeType || 'audio/mpeg', ptt: false })
    } else if (payload.filePath) {
      await sendAudio(jid, payload.filePath)
    }
    return
  }

  if (type === 'video') {
    if (localPath) {
      await sock?.sendMessage(toJID(jid), { video: fs.readFileSync(localPath), caption: text, mimetype: payload.mimeType || 'video/mp4' })
    } else if (payload.filePath) {
      await sendVideo(jid, payload.filePath, text)
    }
    return
  }

  if (type === 'document') {
    if (localPath) {
      await sock?.sendMessage(toJID(jid), {
        document: fs.readFileSync(localPath),
        mimetype: payload.mimeType || 'application/octet-stream',
        fileName: payload.fileName || path.basename(localPath),
        caption: text,
      })
    } else if (payload.filePath) {
      await sendDocument(jid, payload.filePath, payload.fileName || 'arquivo', payload.mimeType || 'application/octet-stream')
    }
    return
  }

  // fallback
  if (text) await sendText(jid, text)
}

// Adapter global para as API routes
globalForWA._waService = {
  isConnected: () => connectionStatus === 'connected' && !!sock,
  connect: async () => { await connectWhatsApp() },
  logout: async () => { await disconnectWhatsApp() },
  clearSession: () => { clearSession() },
  getStatus: () => ({ connected: connectionStatus === 'connected', hasQR: !!qrCode }),
  getQR: () => qrCode,
  sendMessage: async (jid, payload) => {
    if (!sock) throw new Error('WhatsApp não conectado')
    await sendViaAdapter(jid, payload)
  },
}

// Compat: também expõe no global tradicional
;(globalThis as unknown as { _waService?: typeof globalForWA._waService })._waService = globalForWA._waService

// ─── PROCESSAR MENSAGEM RECEBIDA ─────────────────────────────────────────────

async function handleIncomingMessage(
  msg: proto.IWebMessageInfo,
  opts: { source?: 'live' | 'history'; skipRead?: boolean; skipBot?: boolean } = {}
) {
  const from  = msg.key.remoteJid!
  const phone = fromJID(from)
  const msgId = msg.key.id!
  const name  = msg.pushName || undefined
  let avatarUrl: string | undefined

  const existingContact = await prisma.contact.findUnique({ where: { phone } }).catch(() => null)
  if (!existingContact?.avatar && sock) {
    try { avatarUrl = await sock.profilePictureUrl(toJID(phone), 'image') || undefined } catch {}
  } else {
    avatarUrl = existingContact?.avatar || undefined
  }

  const { content, type, mediaUrl } = await parseAndDownload(msg)
  if (!content && !mediaUrl) return
  const rawContent = content
  const displayContent = name && rawContent ? `*${name}*\n\n${rawContent}` : rawContent

  const contact = await prisma.contact.upsert({
    where:  { phone },
    create: { phone, name, ...(avatarUrl ? { avatar: avatarUrl } : {}) },
    update: {
      ...(name ? { name } : {}),
      ...(avatarUrl && avatarUrl !== existingContact?.avatar ? { avatar: avatarUrl } : {}),
    },
  })

  let conversation = await prisma.conversation.findFirst({
    where: { contactId: contact.id, status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] } },
    orderBy: { updatedAt: 'desc' },
  })

  const isNew = !conversation
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { contactId: contact.id, status: 'OPEN' },
    })
  }

  // Dedup por whatsappId
  if (msgId) {
    const dup = await prisma.message.findFirst({ where: { whatsappId: msgId } })
    if (dup) return
  }

  const savedMsg = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderType: 'CONTACT',
      type,
      content: displayContent,
      mediaUrl,
      whatsappId: msgId,
      status: 'DELIVERED',
    },
  })

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessage:   displayContent.substring(0, 100),
      lastMessageAt: new Date(),
      unreadCount:   { increment: 1 },
    },
  })

  emitToRoom('conversations', 'new_message', {
    conversationId: conversation.id,
    message: savedMsg,
    contactId: contact.id,
  })

  if (!opts.skipRead) {
    await markAsRead(phone, msgId)
  }
  await dispatchWebhook('new_message', { message: savedMsg, conversation, contact })

  if (isNew && !opts.skipBot) {
    await dispatchWebhook('conversation_started', { conversation, contact })
    await triggerBotResponse(conversation.id, phone, rawContent)
  }
}

// ─── BOT ─────────────────────────────────────────────────────────────────────

async function triggerBotResponse(conversationId: string, phone: string, text: string) {
  const bot = await prisma.botConfig.findFirst({
    where: { isActive: true },
    include: { flows: { orderBy: { order: 'asc' } } },
  })
  if (!bot) return

  let response: string | null = bot.welcomeMsg || null
  let action: string | null = null
  let actionData: string | null = null

  for (const flow of bot.flows) {
    let matched = false
    try {
      matched = new RegExp(flow.trigger, 'i').test(text)
    } catch {
      matched = text.toLowerCase().includes(flow.trigger.toLowerCase())
    }
    if (matched) {
      response  = flow.response
      action    = flow.action    || null
      actionData = flow.actionData || null
      break
    }
  }

  // IA como fallback se habilitada
  if (!response && bot.aiEnabled && bot.aiPrompt) {
    try {
      const { getAIBotResponse } = await import('./ai')
      const ai = await getAIBotResponse(text, conversationId)
      if (ai.content) response = ai.content
    } catch { }
  }

  if (!response) response = bot.fallbackMsg || null
  if (!response) return

  await sendText(phone, response)
  await prisma.message.create({
    data: { conversationId, senderType: 'BOT', type: 'TEXT', content: response, isBot: true, status: 'SENT' },
  })

  if (action === 'transfer_to_team' && actionData) {
    try {
      const { teamId } = JSON.parse(actionData)
      await prisma.conversation.update({
        where: { id: conversationId },
        data:  { teamId, status: 'WAITING' },
      })
    } catch { }
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function toJID(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  return clean.includes('@') ? phone : `${clean}@s.whatsapp.net`
}

function fromJID(jid: string): string {
  return jid.split('@')[0].split(':')[0]
}

function defaultContentForType(type: string, fallback?: string | null) {
  if (fallback) return fallback
  switch (type) {
    case 'IMAGE': return '[Imagem]'
    case 'VIDEO': return '[Video]'
    case 'AUDIO': return '[Audio]'
    case 'DOCUMENT': return '[Documento]'
    case 'STICKER': return '[Sticker]'
    default: return '[Mensagem]'
  }
}

async function parseAndDownload(msg: proto.IWebMessageInfo): Promise<{ content: string; type: string; mediaUrl?: string }> {
  const m = msg.message
  if (!m) return { content: '', type: 'TEXT' }

  const inner: any =
    m.ephemeralMessage?.message ||
    m.viewOnceMessage?.message ||
    m.viewOnceMessageV2?.message?.viewOnceMessage?.message ||
    m

  if (inner.conversation)        return { content: inner.conversation, type: 'TEXT' }
  if (inner.extendedTextMessage) return { content: inner.extendedTextMessage.text || '', type: 'TEXT' }

  const mediaMap: Record<string, { type: string; ext: string | null }> = {
    imageMessage:    { type: 'IMAGE',    ext: 'jpg'  },
    audioMessage:    { type: 'AUDIO',    ext: 'ogg'  },
    videoMessage:    { type: 'VIDEO',    ext: 'mp4'  },
    documentMessage: { type: 'DOCUMENT', ext: null   },
    stickerMessage:  { type: 'STICKER',  ext: 'webp' },
  }

  for (const [key, meta] of Object.entries(mediaMap)) {
    if (!inner[key]) continue
    const mediaObj: any = inner[key]
    const caption = mediaObj.caption || null
    const docName = key === 'documentMessage' ? (mediaObj.fileName || 'documento') : null
    const ext = meta.ext || (docName?.split('.').pop() || 'bin')
    const mime = mediaObj.mimetype || 'application/octet-stream'

    try {
      const buffer = await downloadMediaMessage(
        msg,
        'buffer',
        {},
        { logger, reuploadRequest: sock?.updateMediaMessage }
      )

      if (buffer?.length) {
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer)
        return {
          type: meta.type,
          content: defaultContentForType(meta.type, caption || docName),
          mediaUrl: `/uploads/${filename}`,
        }
      }
    } catch (e: any) {
      console.warn(`[Baileys] Download de mídia falhou (${key}):`, e?.message || e)
    }

    return { type: meta.type, content: defaultContentForType(meta.type, caption || docName) }
  }

  if (inner.locationMessage) {
    const name = inner.locationMessage.name || ''
    return { content: `[Localizacao] ${name}`.trim(), type: 'LOCATION' }
  }
  if (inner.buttonsResponseMessage) return { content: inner.buttonsResponseMessage.selectedDisplayText || '', type: 'TEXT' }
  if (inner.listResponseMessage)    return { content: inner.listResponseMessage.title || '', type: 'TEXT' }
  if (inner.templateButtonReplyMessage) return { content: inner.templateButtonReplyMessage.selectedDisplayText || '', type: 'TEXT' }

  return { content: '[Mensagem não suportada]', type: 'TEXT' }
}