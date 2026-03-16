'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { ConversationList } from '@/components/chat/ConversationList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { ContactPanel } from '@/components/chat/ContactPanel'
import type { Conversation } from '@/types'

export default function ConversationsPage() {
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [showContactPanel, setShowContactPanel] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.success) {
        setCurrentUserId(data.data.id)
        setCurrentUserName(data.data.name || 'Atendente')
      }
    } catch {}
  }, [])

  const fetchConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`)
      const data = await res.json()
      if (data.success) {
        setSelected(data.data)
        setShowContactPanel(true)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchCurrentUser()
  }, [fetchCurrentUser])

  useEffect(() => {
    const convId = searchParams.get('id')
    if (convId) fetchConversation(convId)
  }, [searchParams, fetchConversation])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation List */}
      <ConversationList
        selectedId={selected?.id}
        onSelect={(conv) => {
          setSelected(conv)
          setShowContactPanel(true)
        }}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex min-w-0">
        {selected ? (
          <>
            <div className="flex-1 min-w-0">
              <ChatWindow
                conversation={selected}
                currentUserId={currentUserId || 'unknown'}
                currentUserName={currentUserName || 'Atendente'}
              />
            </div>

            {/* Contact Info Panel */}
            {showContactPanel && (
              <ContactPanel
                conversation={selected}
                onUpdate={() => {
                  fetchConversation(selected.id)
                }}
              />
            )}
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
        <MessageSquare className="w-10 h-10 text-emerald-500/50" />
      </div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2">
        Selecione uma conversa
      </h3>
      <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
        Escolha uma conversa na lista ao lado para começar a atender
      </p>
    </div>
  )
}
