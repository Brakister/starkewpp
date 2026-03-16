require('dotenv').config()
const { createServer } = require('http')
const { parse }        = require('url')
const next             = require('next')
const { Server }       = require('socket.io')

const dev    = process.env.NODE_ENV !== 'production'
const port   = parseInt(process.env.PORT || '3000')
const app    = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url, true))
  })

  // Socket.io — acessível globalmente pelas API routes via global._io
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  })
  global._io = io
  global.io = io
  globalThis.io = io

  setupSocketHandlers(io)

  // WhatsApp Service agora é inicializado via services/whatsapp-baileys
  // (evita duas conexões concorrentes com o mesmo WhatsApp)
  // Habilita require de arquivos TS no runtime (dev)
  require('ts-node/register/transpile-only')
  require('tsconfig-paths/register')
  const { connectWhatsApp } = require('./services/whatsapp-baileys.ts')
  connectWhatsApp().catch((err) =>
    console.error('[Baileys] Erro na conexão automática:', err)
  )

  httpServer.listen(port, () => {
    console.log(`\n🚀 ZapFlow pronto em http://localhost:${port}\n`)
  })
})

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('[Socket.io] Cliente conectado:', socket.id)
    socket.join('conversations')

    socket.on('join_conversation', (conversationId) => {
      socket.join(`conv:${conversationId}`)
      socket.join(`conversation:${conversationId}`)
    })

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv:${conversationId}`)
      socket.leave(`conversation:${conversationId}`)
    })

    socket.on('typing', ({ conversationId, isTyping, name }) => {
      socket.to(`conv:${conversationId}`).emit('typing_indicator', { conversationId, isTyping, name })
    })

    socket.on('disconnect', () => {
      console.log('[Socket.io] Desconectado:', socket.id)
    })
  })
}
