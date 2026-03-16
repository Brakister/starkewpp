/**
 * Socket.io endpoint — Next.js App Router
 *
 * Este handler inicializa o Socket.io no servidor HTTP do Next.js.
 * Roda na primeira requisição WebSocket recebida.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Server as SocketIOServer } from 'socket.io'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Singleton global
const globalForIO = globalThis as unknown as {
  io: SocketIOServer | undefined
  httpServer: unknown
}

// Mapa userId → Set de socket IDs
const userSockets = new Map<string, Set<string>>()

function getIO(res: unknown): SocketIOServer | null {
  // Acessa o servidor HTTP subjacente do Next.js
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const httpServer = (res as any)?.socket?.server

  if (!httpServer) return null
  if (globalForIO.io) return globalForIO.io

  console.log('[Socket.io] Iniciando servidor...')

  const io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  // Auth middleware
  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '')

    if (!token) return next(new Error('Token ausente'))

    const session = await verifyToken(token)
    if (!session) return next(new Error('Token inválido'))

    socket.data.userId = session.userId
    socket.data.role = session.role
    socket.data.name = session.name
    next()
  })

  io.on('connection', async (socket) => {
    const userId = socket.data.userId
    console.log(`[Socket.io] Conectado: ${socket.data.name} (${socket.id})`)

    // Registra socket do usuário
    if (!userSockets.has(userId)) userSockets.set(userId, new Set())
    userSockets.get(userId)!.add(socket.id)

    socket.join(`user:${userId}`)
    socket.join('conversations')

    // Entra nas conversas atribuídas
    const assignments = await prisma.conversationAssignment.findMany({
      where: { userId, isActive: true },
      select: { conversationId: true },
    })
    assignments.forEach(a => socket.join(`conversation:${a.conversationId}`))

    // Atualiza status para online
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'ONLINE', lastSeenAt: new Date() },
    })
    socket.broadcast.emit('agent_status_change', { userId, status: 'ONLINE' })

    // ── Eventos do cliente ──────────────────────────────────────────────

    socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
      socket.to(`conversation:${data.conversationId}`).emit('typing_indicator', {
        userId,
        name: socket.data.name,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
      })
    })

    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`)
    })

    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`)
    })

    socket.on('set_status', async (status: 'ONLINE' | 'BUSY' | 'OFFLINE') => {
      await prisma.user.update({
        where: { id: userId },
        data: { status, lastSeenAt: new Date() },
      })
      io.emit('agent_status_change', { userId, status })
    })

    socket.on('disconnect', async () => {
      const sockets = userSockets.get(userId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          userSockets.delete(userId)
          await prisma.user.update({
            where: { id: userId },
            data: { status: 'OFFLINE', lastSeenAt: new Date() },
          })
          io.emit('agent_status_change', { userId, status: 'OFFLINE' })
        }
      }
    })
  })

  globalForIO.io = io
  return io
}

// ── Funções auxiliares para emitir eventos de outros módulos ──────────────────

export function emitToUser(userId: string, event: string, data: unknown) {
  globalForIO.io?.to(`user:${userId}`).emit(event, data)
}

export function emitToRoom(room: string, event: string, data: unknown) {
  globalForIO.io?.to(room).emit(event, data)
}

export function emitToConversation(conversationId: string, event: string, data: unknown) {
  globalForIO.io?.to(`conversation:${conversationId}`).emit(event, data)
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Este endpoint é acessado pelo Socket.io client para o handshake
  // O socket.io cuida do upgrade para WebSocket automaticamente
  return new NextResponse('Socket.io server running', { status: 200 })
}
