/**
 * Socket.io helpers — re-exporta do route handler centralizado
 * Permite que outros serviços (whatsapp-baileys, webhook-dispatcher, etc.)
 * emitam eventos sem importar diretamente do route handler do Next.js
 */

// Singleton global compartilhado entre todos os módulos
const globalForIO = globalThis as unknown as {
  io: import('socket.io').Server | null
}

export function emitToRoom(room: string, event: string, data: unknown) {
  if (!globalForIO.io) return
  globalForIO.io.to(room).emit(event, data)
}

export function emitToUser(userId: string, event: string, data: unknown) {
  if (!globalForIO.io) return
  globalForIO.io.to(`user:${userId}`).emit(event, data)
}

export function emitToConversation(conversationId: string, event: string, data: unknown) {
  if (!globalForIO.io) return
  globalForIO.io.to(`conversation:${conversationId}`).emit(event, data)
}

export function broadcastToAll(event: string, data: unknown) {
  if (!globalForIO.io) return
  globalForIO.io.emit(event, data)
}

export function getIO() {
  return globalForIO.io
}
