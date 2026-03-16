'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send, Paperclip, Smile, Zap, MoreVertical, Phone, Video,
  UserPlus, Tag, Archive, Lock, Unlock, ChevronDown, Check, CheckCheck
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Conversation, Message } from '@/types'
import { useSocket } from '@/components/layout/SocketProvider'

interface ChatWindowProps {
  conversation: Conversation
  currentUserId: string
  currentUserName: string
}

const MESSAGE_STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING: <Check className="w-3 h-3 text-gray-600" />,
  SENT: <Check className="w-3 h-3 text-gray-400" />,
  DELIVERED: <CheckCheck className="w-3 h-3 text-gray-400" />,
  READ: <CheckCheck className="w-3 h-3 text-emerald-400" />,
  FAILED: <span className="text-[10px] text-red-400">!</span>,
}

export function ChatWindow({ conversation, currentUserId, currentUserName }: ChatWindowProps) {
  const { socket } = useSocket()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [isPrivate, setIsPrivate] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const contactName = conversation.contact?.name || conversation.contact?.phone || 'Desconhecido'

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/messages?conversationId=${conversation.id}`)
      const data = await res.json()
      if (data.success) setMessages(data.data)
    } finally {
      setLoading(false)
    }
  }, [conversation.id])

  useEffect(() => {
    fetchMessages()
    socket?.emit('join_conversation', conversation.id)
    return () => {
      socket?.emit('leave_conversation', conversation.id)
    }
  }, [conversation.id, fetchMessages, socket])

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time events
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (data: { conversationId: string; message: Message }) => {
      if (data.conversationId !== conversation.id) return
      setMessages(prev => {
        if (prev.some(m => m.id === data.message.id || (m.whatsappId && m.whatsappId === data.message.whatsappId))) {
          return prev
        }
        // If this is our own message, replace an optimistic pending one instead of appending
        if (data.message.senderType === 'AGENT' && data.message.senderId === currentUserId) {
          const idx = prev.findIndex(m =>
            m.status === 'PENDING' &&
            m.senderType === 'AGENT' &&
            m.senderId === currentUserId &&
            m.content === data.message.content
          )
          if (idx !== -1) {
            const next = [...prev]
            next[idx] = data.message
            return next
          }
          return prev
        }
        return [...prev, data.message]
      })
    }

    const handleTyping = (data: { userId: string; name: string; conversationId: string; isTyping: boolean }) => {
      if (data.conversationId !== conversation.id || data.userId === currentUserId) return
      setTypingUsers(prev =>
        data.isTyping ? [...new Set([...prev, data.name])] : prev.filter(u => u !== data.name)
      )
    }

    socket.on('new_message', handleNewMessage)
    socket.on('typing_indicator', handleTyping)

    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('typing_indicator', handleTyping)
    }
  }, [socket, conversation.id, currentUserId])

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    if (!isTyping) {
      setIsTyping(true)
      socket?.emit('typing', { conversationId: conversation.id, isTyping: true, name: currentUserName })
    }
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      socket?.emit('typing', { conversationId: conversation.id, isTyping: false, name: currentUserName })
    }, 2000)
  }

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)

    // Optimistic update
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      conversationId: conversation.id,
      senderId: currentUserId,
      senderType: 'AGENT',
      type: 'TEXT',
      content,
      status: 'PENDING',
      isBot: false,
      isPrivate,
      metadata: JSON.stringify({ senderName: currentUserName }),
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          content,
          type: 'TEXT',
          isPrivate
        })
      })
      const data = await res.json()
      if (data.success) {
        // Replace optimistic with real, but avoid duplication if socket already added
        setMessages(prev => {
          const already = prev.some(m => m.id === data.data.id || (m.whatsappId && m.whatsappId === data.data.whatsappId))
          if (already) return prev.filter(m => m.id !== optimistic.id)
          return prev.map(m => m.id === optimistic.id ? data.data : m)
        })
      } else {
        setMessages(prev => prev.map(m =>
          m.id === optimistic.id ? { ...m, status: 'FAILED' as const } : m
        ))
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === optimistic.id ? { ...m, status: 'FAILED' as const } : m
      ))
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Group messages by date
  const groupedMessages = groupByDate(messages)

  return (
    <div className="flex flex-col h-full bg-[#0f1117]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#0a0c10] shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/40 to-purple-700/40 flex items-center justify-center text-sm font-semibold text-white border border-white/10">
          {contactName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{contactName}</p>
          <p className="text-xs text-gray-500 truncate">{conversation.contact?.phone}</p>
        </div>
        <div className="flex items-center gap-1">
          {conversation.team && (
            <span
              className="text-xs px-2 py-1 rounded-lg font-medium"
              style={{ background: `${conversation.team.color}20`, color: conversation.team.color }}
            >
              {conversation.team.name}
            </span>
          )}
          <button className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all">
            <UserPlus className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all">
            <Tag className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all">
            <Archive className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] text-gray-600 px-2 py-1 bg-white/3 rounded-full">
                  {date}
                </span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              {/* Messages in this date group */}
              <div className="space-y-1">
                {msgs.map((msg, i) => {
                  const isOwn = msg.senderType === 'AGENT' || msg.senderType === 'BOT'
                  const isContact = msg.senderType === 'CONTACT'
                  const isSystem = msg.senderType === 'SYSTEM'
                  const showAvatar = i === 0 || msgs[i - 1]?.senderType !== msg.senderType
                  let metaName: string | null = null
                  if (msg.metadata) {
                    try { metaName = JSON.parse(msg.metadata).senderName || null } catch {}
                  }
                  const assignedName = conversation.assignments?.[0]?.user?.name
                  const displayName = msg.sender?.name || metaName || (isOwn ? (assignedName || 'Atendente') : null)

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <span className="text-[11px] text-gray-600 bg-white/3 px-3 py-1 rounded-full">
                          {msg.content}
                        </span>
                      </div>
                    )
                  }

                  if (msg.isPrivate) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs px-3 py-2 rounded-xl max-w-md">
                          <Lock className="w-3 h-3 shrink-0" />
                          <span><strong>{msg.sender?.name}:</strong> {msg.content}</span>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex items-end gap-2',
                        isOwn ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      {/* Avatar placeholder for spacing */}
                      <div className="w-6 shrink-0">
                        {showAvatar && isContact && (
                          <div className="w-6 h-6 rounded-full bg-violet-500/30 flex items-center justify-center text-[10px] text-white font-bold">
                            {contactName.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className={cn('max-w-[70%] group')}>
                        {/* Sender name (for agent msgs) */}
                        {isOwn && showAvatar && displayName && (
                          <p className={cn('text-[10px] text-gray-600 mb-1', isOwn ? 'text-right' : 'text-left')}>
                            {displayName}
                            {msg.isBot && ' (Bot)'}
                          </p>
                        )}

                        <div className={cn(
                          'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
                          isOwn
                            ? 'bg-emerald-600 text-white rounded-br-sm'
                            : 'bg-[#1a1d27] text-gray-100 border border-white/5 rounded-bl-sm'
                        )}>
                          {renderMessageContent(msg)}
                        </div>

                        <div className={cn(
                          'flex items-center gap-1 mt-1 px-1',
                          isOwn ? 'flex-row-reverse' : 'flex-row'
                        )}>
                          <span className="text-[10px] text-gray-700">
                            {format(new Date(msg.createdAt), 'HH:mm')}
                          </span>
                          {isOwn && MESSAGE_STATUS_ICON[msg.status]}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-violet-500/30" />
            <div className="bg-[#1a1d27] border border-white/5 px-3.5 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/5 bg-[#0a0c10] p-3 shrink-0">
        {/* Private note toggle */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setIsPrivate(!isPrivate)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all',
              isPrivate
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'
            )}
          >
            {isPrivate ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            {isPrivate ? 'Nota privada' : 'Mensagem pública'}
          </button>
        </div>

        <div className={cn(
          'flex items-end gap-2 rounded-xl border transition-all p-2',
          isPrivate
            ? 'bg-amber-500/5 border-amber-500/20'
            : 'bg-white/5 border-white/8 focus-within:border-emerald-500/40'
        )}>
          <div className="flex gap-1">
            <button className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-600 hover:text-gray-300 transition-all">
              <Paperclip className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-600 hover:text-gray-300 transition-all">
              <Zap className="w-4 h-4" />
            </button>
          </div>

          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isPrivate ? 'Escrever nota interna...' : 'Escrever mensagem...'}
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder:text-gray-600 resize-none focus:outline-none max-h-32 leading-relaxed py-1"
            style={{ minHeight: '32px' }}
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0',
              input.trim()
                ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                : 'bg-white/5 text-gray-600 cursor-not-allowed'
            )}
          >
            {sending
              ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
          </button>
        </div>

        <p className="text-[10px] text-gray-700 mt-1.5 text-right">
          Enter para enviar • Shift+Enter para nova linha
        </p>
      </div>
    </div>
  )
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function renderMessageContent(msg: Message) {
  switch (msg.type) {
    case 'IMAGE':
      return (
        <div className="space-y-1">
          {msg.mediaUrl && (
            <img src={msg.mediaUrl} alt="Imagem" className="rounded-lg max-w-full max-h-48 object-cover" />
          )}
          {msg.content && msg.content !== '[Imagem]' && (
            <p className="text-sm">{msg.content}</p>
          )}
        </div>
      )
    case 'AUDIO':
      return (
        <div className="flex items-center gap-2">
          {msg.mediaUrl ? (
            <audio controls src={msg.mediaUrl} className="w-full max-w-xs" />
          ) : (
            <span className="text-sm text-gray-300">Mensagem de audio</span>
          )}
        </div>
      )
    case 'VIDEO':
      return (
        <div className="space-y-1">
          {msg.mediaUrl ? (
            <video controls src={msg.mediaUrl} className="rounded-lg max-w-full max-h-60" />
          ) : (
            <span className="text-sm text-gray-300">Mensagem de video</span>
          )}
          {msg.content && msg.content !== '[Video]' && (
            <p className="text-sm">{msg.content}</p>
          )}
        </div>
      )
    case 'DOCUMENT':
      return (
        <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
          {msg.mediaUrl ? (
            <a
              href={msg.mediaUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm underline truncate"
            >
              {msg.content || 'Documento'}
            </a>
          ) : (
            <span className="text-sm truncate">{msg.content}</span>
          )}
        </div>
      )
    case 'STICKER':
      return (
        <div className="space-y-1">
          {msg.mediaUrl ? (
            <img src={msg.mediaUrl} alt="Sticker" className="rounded-lg max-w-[160px]" />
          ) : (
            <span className="text-sm text-gray-300">Sticker</span>
          )}
        </div>
      )
    case 'LOCATION':
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm">Localizacao:</span>
          <span className="text-sm">{msg.content}</span>
        </div>
      )
    default:
      return <p className="whitespace-pre-wrap break-words">{msg.content}</p>
  }
}

function groupByDate(messages: Message[]): Record<string, Message[]> {
  return messages.reduce((groups, msg) => {
    const date = format(new Date(msg.createdAt), "d 'de' MMMM, yyyy", { locale: ptBR })
    if (!groups[date]) groups[date] = []
    groups[date].push(msg)
    return groups
  }, {} as Record<string, Message[]>)
}
