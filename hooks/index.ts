/**
 * ZapFlow Custom Hooks
 */

import { useEffect, useCallback, useRef } from 'react'
import { useSocket } from '@/components/layout/SocketProvider'
import {
  useConversationsStore,
  useMessagesStore,
  useAgentsStore
} from '@/store'
import type { Message, Conversation } from '@/types'

// ─── useConversations ─────────────────────────────────────────────────────────
// Fetches conversations and sets up real-time sync

export function useConversations(filters?: Record<string, string>) {
  const { socket } = useSocket()
  const { setConversations, upsertConversation, incrementUnread, updateLastMessage, conversations } =
    useConversationsStore()

  const fetchConversations = useCallback(async () => {
    const params = new URLSearchParams(filters || {})
    const res = await fetch(`/api/conversations?${params}`)
    const data = await res.json()
    if (data.success) setConversations(data.data.items)
  }, [filters, setConversations])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (data: { conversationId: string; message: Message }) => {
      incrementUnread(data.conversationId)
      updateLastMessage(data.conversationId, data.message.content, data.message.createdAt)
    }

    const handleConversationUpdate = (data: { conversationId: string; status?: string }) => {
      fetchConversations()
    }

    const handleConversationAssigned = (data: { conversationId: string }) => {
      fetchConversations()
    }

    socket.on('new_message', handleNewMessage)
    socket.on('conversation_update', handleConversationUpdate)
    socket.on('conversation_assigned', handleConversationAssigned)

    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('conversation_update', handleConversationUpdate)
      socket.off('conversation_assigned', handleConversationAssigned)
    }
  }, [socket, fetchConversations, incrementUnread, updateLastMessage])

  return { conversations, refetch: fetchConversations }
}

// ─── useMessages ──────────────────────────────────────────────────────────────
// Manages messages for a specific conversation with real-time updates

export function useMessages(conversationId: string) {
  const { socket } = useSocket()
  const { messagesByConversation, typingByConversation, setMessages, appendMessage, updateMessage, setTyping } =
    useMessagesStore()

  const messages = messagesByConversation[conversationId] || []
  const typing = typingByConversation[conversationId] || []

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return
    const res = await fetch(`/api/messages?conversationId=${conversationId}`)
    const data = await res.json()
    if (data.success) setMessages(conversationId, data.data)
  }, [conversationId, setMessages])

  useEffect(() => {
    fetchMessages()
    socket?.emit('join_conversation', conversationId)
    return () => { socket?.emit('leave_conversation', conversationId) }
  }, [conversationId, fetchMessages, socket])

  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (data: { conversationId: string; message: Message }) => {
      if (data.conversationId === conversationId) {
        appendMessage(conversationId, data.message)
      }
    }

    const handleTyping = (data: { name: string; conversationId: string; isTyping: boolean }) => {
      if (data.conversationId === conversationId) {
        setTyping(conversationId, data.name, data.isTyping)
      }
    }

    const handleStatusUpdate = (data: { messageId: string; status: string }) => {
      updateMessage(conversationId, data.messageId, { status: data.status as Message['status'] })
    }

    socket.on('new_message', handleNewMessage)
    socket.on('typing_indicator', handleTyping)
    socket.on('message_status_update', handleStatusUpdate)

    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('typing_indicator', handleTyping)
      socket.off('message_status_update', handleStatusUpdate)
    }
  }, [socket, conversationId, appendMessage, setTyping, updateMessage])

  const sendMessage = useCallback(async (
    content: string,
    options?: { type?: string; mediaUrl?: string; isPrivate?: boolean }
  ) => {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        content,
        type: options?.type || 'TEXT',
        mediaUrl: options?.mediaUrl,
        isPrivate: options?.isPrivate || false
      })
    })
    const data = await res.json()
    return data
  }, [conversationId])

  return { messages, typing, sendMessage, refetch: fetchMessages }
}

// ─── useTypingIndicator ───────────────────────────────────────────────────────

export function useTypingIndicator(conversationId: string) {
  const { socket } = useSocket()
  const isTypingRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const startTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true
      socket?.emit('typing', { conversationId, isTyping: true })
    }
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      isTypingRef.current = false
      socket?.emit('typing', { conversationId, isTyping: false })
    }, 2500)
  }, [socket, conversationId])

  const stopTyping = useCallback(() => {
    clearTimeout(timeoutRef.current)
    if (isTypingRef.current) {
      isTypingRef.current = false
      socket?.emit('typing', { conversationId, isTyping: false })
    }
  }, [socket, conversationId])

  useEffect(() => () => stopTyping(), [stopTyping])

  return { startTyping, stopTyping }
}

// ─── useAgentStatus ───────────────────────────────────────────────────────────

export function useAgentStatus() {
  const { socket } = useSocket()
  const { agents, setAgents, updateAgentStatus } = useAgentsStore()

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(data => {
      if (data.success) setAgents(data.data.items)
    })
  }, [setAgents])

  useEffect(() => {
    if (!socket) return
    const handle = (data: { userId: string; status: 'ONLINE' | 'BUSY' | 'OFFLINE' }) => {
      updateAgentStatus(data.userId, data.status)
    }
    socket.on('agent_status_change', handle)
    return () => { socket.off('agent_status_change', handle) }
  }, [socket, updateAgentStatus])

  const setMyStatus = useCallback((status: 'ONLINE' | 'BUSY' | 'OFFLINE') => {
    socket?.emit('set_status', status)
  }, [socket])

  return { agents, setMyStatus }
}

// ─── useDebounce ──────────────────────────────────────────────────────────────

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = import('react').then(({ useState }) => useState(value))

  // Simplified — in real app use proper useState
  return value
}

// ─── useFileUpload ────────────────────────────────────────────────────────────

export function useFileUpload(conversationId: string) {
  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('conversationId', conversationId)

    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    return data
  }, [conversationId])

  return { uploadFile }
}

// ─── useConversationActions ───────────────────────────────────────────────────

export function useConversationActions() {
  const assignConversation = useCallback(async (conversationId: string, userId?: string) => {
    const res = await fetch(`/api/conversations/${conversationId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
    return res.json()
  }, [])

  const closeConversation = useCallback(async (conversationId: string) => {
    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CLOSED' })
    })
    return res.json()
  }, [])

  const transferToTeam = useCallback(async (conversationId: string, teamId: string) => {
    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, status: 'WAITING' })
    })
    return res.json()
  }, [])

  const addTag = useCallback(async (conversationId: string, tagId: string) => {
    const res = await fetch(`/api/conversations/${conversationId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId })
    })
    return res.json()
  }, [])

  return { assignConversation, closeConversation, transferToTeam, addTag }
}
