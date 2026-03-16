'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, Plus, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Conversation, ConversationFilters, ConversationStatus } from '@/types'
import { useSocket } from '@/components/layout/SocketProvider'

const STATUS_TABS: { value: ConversationStatus | 'ALL'; label: string; color: string }[] = [
  { value: 'ALL', label: 'Todas', color: 'text-gray-400' },
  { value: 'OPEN', label: 'Abertas', color: 'text-blue-400' },
  { value: 'IN_PROGRESS', label: 'Em atend.', color: 'text-amber-400' },
  { value: 'WAITING', label: 'Aguard.', color: 'text-purple-400' },
  { value: 'CLOSED', label: 'Finalizadas', color: 'text-gray-500' },
]

const STATUS_DOT: Record<string, string> = {
  OPEN: 'bg-blue-400',
  IN_PROGRESS: 'bg-amber-400',
  WAITING: 'bg-purple-400',
  CLOSED: 'bg-gray-600',
}

interface ConversationListProps {
  selectedId?: string
  onSelect: (conversation: Conversation) => void
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { socket } = useSocket()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ConversationFilters>({ status: 'ALL' })
  const [search, setSearch] = useState('')

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status && filters.status !== 'ALL') params.set('status', filters.status)
      if (filters.teamId) params.set('teamId', filters.teamId)
      if (filters.agentId) params.set('agentId', filters.agentId)
      if (search) params.set('search', search)

      const res = await fetch(`/api/conversations?${params}`)
      const data = await res.json()
      if (data.success) setConversations(data.data.items)
    } finally {
      setLoading(false)
    }
  }, [filters, search])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Real-time updates
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (data: { conversationId: string; message: any }) => {
      const isFromContact = data.message?.senderType === 'CONTACT'
      setConversations(prev =>
        prev.map(c => c.id === data.conversationId
          ? { ...c, unreadCount: c.unreadCount + (isFromContact ? 1 : 0), lastMessageAt: new Date().toISOString() }
          : c
        ).sort((a, b) =>
          new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
        )
      )
    }

    const handleConversationUpdate = () => fetchConversations()

    socket.on('new_message', handleNewMessage)
    socket.on('conversation_update', handleConversationUpdate)

    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('conversation_update', handleConversationUpdate)
    }
  }, [socket, fetchConversations])

  return (
    <div className="flex flex-col h-full bg-[#0d0f18] border-r border-white/5 w-80 shrink-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Conversas</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchConversations}
              className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
            <button className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all">
              <Filter className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center transition-all">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-white/5 border border-white/8 rounded-xl pl-8 pr-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40 transition-all"
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none -mx-1 px-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilters(f => ({ ...f, status: tab.value }))}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                filters.status === tab.value
                  ? 'bg-white/10 text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Items */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-white/3 animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-600">
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {conversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={conv.id === selectedId}
                onClick={() => onSelect(conv)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ConversationItem({
  conversation: conv,
  isSelected,
  onClick,
}: {
  conversation: Conversation
  isSelected: boolean
  onClick: () => void
}) {
  const contactName = conv.contact?.name || conv.contact?.phone || 'Desconhecido'
  const initials = contactName.charAt(0).toUpperCase()
  const timeAgo = conv.lastMessageAt
    ? formatDistanceToNow(new Date(conv.lastMessageAt), { locale: ptBR, addSuffix: false })
    : ''

  const assignedAgent = conv.assignments?.[0]?.user

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all group',
        isSelected ? 'bg-emerald-500/12 border border-emerald-500/20' : 'hover:bg-white/4'
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/40 to-purple-700/40 flex items-center justify-center text-sm font-semibold text-white border border-white/10">
          {initials}
        </div>
        <span className={cn(
          'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0d0f18]',
          STATUS_DOT[conv.status] || 'bg-gray-600'
        )} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className={cn(
            'text-sm font-medium truncate',
            isSelected ? 'text-white' : 'text-gray-200'
          )}>
            {contactName}
          </span>
          <span className="text-[10px] text-gray-600 shrink-0">{timeAgo}</span>
        </div>
        <p className="text-xs text-gray-500 truncate">
          {conv.lastMessage || 'Sem mensagens'}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          {conv.team && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: `${conv.team.color}20`, color: conv.team.color }}
            >
              {conv.team.name}
            </span>
          )}
          {conv.tags?.slice(0, 2).map(ct => (
            <span
              key={ct.tag?.id}
              className="text-[10px] px-1.5 py-0.5 rounded-md"
              style={{ background: `${ct.tag?.color}20`, color: ct.tag?.color }}
            >
              {ct.tag?.name}
            </span>
          ))}
          {assignedAgent && (
            <span className="text-[10px] text-gray-600 ml-auto truncate">
              {assignedAgent.name.split(' ')[0]}
            </span>
          )}
        </div>
      </div>

      {/* Unread badge */}
      {conv.unreadCount > 0 && (
        <div className="shrink-0 min-w-[18px] h-[18px] bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
        </div>
      )}
    </button>
  )
}
