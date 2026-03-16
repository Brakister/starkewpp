/**
 * ZapFlow - Global Store (Zustand)
 * Manages client-side state for conversations, messages, and UI
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Conversation, Message, User, AuthSession } from '@/types'

// ─── AUTH STORE ───────────────────────────────────────────────────────────────

interface AuthStore {
  session: AuthSession | null
  token: string | null
  setSession: (session: AuthSession, token: string) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      session: null,
      token: null,
      setSession: (session, token) => {
        set({ session, token })
        if (typeof window !== 'undefined') {
          localStorage.setItem('zapflow_token', token)
        }
      },
      clearSession: () => {
        set({ session: null, token: null })
        if (typeof window !== 'undefined') {
          localStorage.removeItem('zapflow_token')
        }
      },
    }),
    { name: 'zapflow-auth', partialize: (state) => ({ token: state.token }) }
  )
)

// ─── CONVERSATIONS STORE ──────────────────────────────────────────────────────

interface ConversationsStore {
  conversations: Conversation[]
  selectedId: string | null
  unreadTotal: number

  setConversations: (convs: Conversation[]) => void
  upsertConversation: (conv: Conversation) => void
  setSelected: (id: string | null) => void
  incrementUnread: (conversationId: string) => void
  clearUnread: (conversationId: string) => void
  updateLastMessage: (conversationId: string, message: string, at: string) => void
}

export const useConversationsStore = create<ConversationsStore>()(
  devtools(
    (set, get) => ({
      conversations: [],
      selectedId: null,
      unreadTotal: 0,

      setConversations: (conversations) => {
        const unreadTotal = conversations.reduce((sum, c) => sum + c.unreadCount, 0)
        set({ conversations, unreadTotal })
      },

      upsertConversation: (conv) => {
        const existing = get().conversations.find(c => c.id === conv.id)
        if (existing) {
          set(state => ({
            conversations: state.conversations.map(c => c.id === conv.id ? conv : c)
          }))
        } else {
          set(state => ({ conversations: [conv, ...state.conversations] }))
        }
      },

      setSelected: (selectedId) => set({ selectedId }),

      incrementUnread: (conversationId) => {
        set(state => ({
          conversations: state.conversations.map(c =>
            c.id === conversationId ? { ...c, unreadCount: c.unreadCount + 1 } : c
          ),
          unreadTotal: state.unreadTotal + 1
        }))
      },

      clearUnread: (conversationId) => {
        const conv = get().conversations.find(c => c.id === conversationId)
        const cleared = conv?.unreadCount || 0
        set(state => ({
          conversations: state.conversations.map(c =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c
          ),
          unreadTotal: Math.max(0, state.unreadTotal - cleared)
        }))
      },

      updateLastMessage: (conversationId, message, at) => {
        set(state => ({
          conversations: state.conversations
            .map(c => c.id === conversationId
              ? { ...c, lastMessage: message, lastMessageAt: at }
              : c
            )
            .sort((a, b) =>
              new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
            )
        }))
      },
    }),
    { name: 'conversations' }
  )
)

// ─── MESSAGES STORE ───────────────────────────────────────────────────────────

interface MessagesStore {
  messagesByConversation: Record<string, Message[]>
  typingByConversation: Record<string, string[]> // conversationId -> [userName]

  setMessages: (conversationId: string, messages: Message[]) => void
  appendMessage: (conversationId: string, message: Message) => void
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void
  setTyping: (conversationId: string, userName: string, isTyping: boolean) => void
}

export const useMessagesStore = create<MessagesStore>()(
  devtools(
    (set) => ({
      messagesByConversation: {},
      typingByConversation: {},

      setMessages: (conversationId, messages) => {
        set(state => ({
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: messages
          }
        }))
      },

      appendMessage: (conversationId, message) => {
        set(state => {
          const existing = state.messagesByConversation[conversationId] || []
          // Avoid duplicates
          if (existing.find(m => m.id === message.id)) return state
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: [...existing, message]
            }
          }
        })
      },

      updateMessage: (conversationId, messageId, updates) => {
        set(state => ({
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: (state.messagesByConversation[conversationId] || []).map(m =>
              m.id === messageId ? { ...m, ...updates } : m
            )
          }
        }))
      },

      setTyping: (conversationId, userName, isTyping) => {
        set(state => {
          const current = state.typingByConversation[conversationId] || []
          return {
            typingByConversation: {
              ...state.typingByConversation,
              [conversationId]: isTyping
                ? [...new Set([...current, userName])]
                : current.filter(u => u !== userName)
            }
          }
        })
      },
    }),
    { name: 'messages' }
  )
)

// ─── AGENTS STORE ─────────────────────────────────────────────────────────────

interface AgentsStore {
  agents: User[]
  onlineAgentIds: Set<string>

  setAgents: (agents: User[]) => void
  updateAgentStatus: (userId: string, status: User['status']) => void
}

export const useAgentsStore = create<AgentsStore>()(
  devtools(
    (set) => ({
      agents: [],
      onlineAgentIds: new Set(),

      setAgents: (agents) => {
        const onlineAgentIds = new Set(
          agents.filter(a => a.status === 'ONLINE').map(a => a.id)
        )
        set({ agents, onlineAgentIds })
      },

      updateAgentStatus: (userId, status) => {
        set(state => {
          const newOnline = new Set(state.onlineAgentIds)
          if (status === 'ONLINE') newOnline.add(userId)
          else newOnline.delete(userId)

          return {
            agents: state.agents.map(a => a.id === userId ? { ...a, status } : a),
            onlineAgentIds: newOnline
          }
        })
      },
    }),
    { name: 'agents' }
  )
)

// ─── UI STORE ─────────────────────────────────────────────────────────────────

interface UIStore {
  sidebarCollapsed: boolean
  contactPanelOpen: boolean
  activeModal: string | null

  toggleSidebar: () => void
  setContactPanel: (open: boolean) => void
  openModal: (name: string) => void
  closeModal: () => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      contactPanelOpen: true,
      activeModal: null,

      toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setContactPanel: (contactPanelOpen) => set({ contactPanelOpen }),
      openModal: (activeModal) => set({ activeModal }),
      closeModal: () => set({ activeModal: null }),
    }),
    { name: 'zapflow-ui', partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, contactPanelOpen: s.contactPanelOpen }) }
  )
)
