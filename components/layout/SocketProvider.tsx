'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'

interface SocketContextValue {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextValue>({ socket: null, isConnected: false })

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Conecta ao Socket.io do server.js
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })

    socketRef.current = socket

    socket.on('connect',    () => { setIsConnected(true);  console.log('[Socket.io] Conectado') })
    socket.on('disconnect', () => { setIsConnected(false); console.log('[Socket.io] Desconectado') })

    // WhatsApp events
    socket.on('wa:qr', ({ qr }: { qr: string }) => {
      // Força reload do status na página de configurações
      window.dispatchEvent(new CustomEvent('wa:qr', { detail: { qr } }))
    })

    socket.on('wa:connected', (data: { connected: boolean; phone?: string }) => {
      toast.success('WhatsApp conectado! ✅')
      window.dispatchEvent(new CustomEvent('wa:connected', { detail: data }))
    })

    socket.on('wa:disconnected', () => {
      window.dispatchEvent(new CustomEvent('wa:disconnected'))
    })

    return () => { socket.disconnect(); socketRef.current = null }
  }, [])

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
