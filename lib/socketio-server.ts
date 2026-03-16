/**
 * Socket.io Server — compatível com Next.js App Router (sem custom server)
 *
 * Estratégia: usa um global singleton para garantir que o Socket.io
 * seja inicializado apenas uma vez, mesmo com hot-reload em dev.
 */

import { Server as SocketIOServer } from 'socket.io'

// Global singleton para sobreviver ao hot-reload do Next.js
const globalForIO = globalThis as unknown as { io: SocketIOServer | null }

export function getIO(): SocketIOServer | null {
  return globalForIO.io ?? null
}

export function initSocketIO() {
  if (globalForIO.io) {
    console.log('[Socket.io] Já inicializado, pulando...')
    return globalForIO.io
  }

  // No Next.js 14 sem custom server, o Socket.io se anexa ao servidor HTTP
  // via o hack do globalThis — funciona em dev e produção
  // A conexão real acontece via /api/socket/route.ts
  globalForIO.io = null // será setado quando o primeiro cliente conectar

  console.log('[Socket.io] Pronto para conexões via /api/socket')

  // Auto-reconexão do Baileys foi movida para o server.js
  // para evitar conexões duplicadas.

  return null
}

async function reconnectBaileysIfNeeded() {
  try {
    const fs = await import('fs')
    const path = await import('path')
    const authDir = path.join(process.cwd(), '.baileys-auth')

    if (fs.existsSync(authDir) && fs.readdirSync(authDir).length > 0) {
      console.log('[Baileys] Sessão salva encontrada, reconectando...')
      const { connectWhatsApp } = await import('../services/whatsapp-baileys')
      await connectWhatsApp()
    } else {
      console.log('[Baileys] Sem sessão. Acesse /settings/whatsapp para conectar.')
    }
  } catch (err) {
    console.error('[Baileys] Erro na reconexão:', err)
  }
}
