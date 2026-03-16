/**
 * ZapFlow - Custom Next.js + Socket.io Server
 * Run: npm run dev
 */

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initSocketServer } from './services/socket'
import fs from 'fs'
import path from 'path'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(async () => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error:', err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  // Inicializa Socket.io
  initSocketServer(httpServer)
  console.log('[Socket.io] WebSocket server initialized')

  httpServer.listen(port, () => {
    console.log(`\n> ZapFlow ready on http://${hostname}:${port}`)
    console.log(`> Environment: ${dev ? 'development' : 'production'}\n`)
  })

  // Auto-reconecta WhatsApp se já tiver sessão salva
  const authDir = path.join(process.cwd(), '.baileys-auth')
  const hasSavedSession = fs.existsSync(authDir) &&
    fs.readdirSync(authDir).length > 0

  if (hasSavedSession) {
    console.log('[Baileys] Sessão salva encontrada, reconectando WhatsApp...')
    const { connectWhatsApp } = await import('./services/whatsapp-baileys')
    connectWhatsApp().catch(err =>
      console.error('[Baileys] Erro na reconexão automática:', err)
    )
  } else {
    console.log('[Baileys] Nenhuma sessão salva. Acesse /settings/whatsapp para conectar.')
  }
})
