// ZapFlow - Core TypeScript Types

export type UserRole = 'AGENT' | 'MANAGER' | 'ADMIN'
export type AgentStatus = 'ONLINE' | 'BUSY' | 'OFFLINE'
export type ConversationStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'CLOSED'
export type MessageType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'STICKER' | 'LOCATION' | 'TEMPLATE' | 'INTERACTIVE'
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
export type SenderType = 'CONTACT' | 'AGENT' | 'BOT' | 'SYSTEM'
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  status: AgentStatus
  lastSeenAt?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  teams?: TeamMember[]
}

export interface Team {
  id: string
  name: string
  description?: string
  color: string
  isActive: boolean
  createdAt: string
  members?: TeamMember[]
  _count?: { conversations: number }
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: string
  user?: User
  team?: Team
}

export interface Contact {
  id: string
  phone: string
  name?: string
  email?: string
  avatar?: string
  notes?: string
  isBlocked: boolean
  assignedTo?: string
  createdAt: string
  updatedAt: string
  tags?: Tag[]
  assignedAgent?: User
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface Conversation {
  id: string
  contactId: string
  teamId?: string
  status: ConversationStatus
  isPrivate: boolean
  subject?: string
  lastMessage?: string
  lastMessageAt?: string
  unreadCount: number
  createdAt: string
  updatedAt: string
  closedAt?: string
  contact?: Contact
  team?: Team
  assignments?: ConversationAssignment[]
  tags?: Tag[]
  messages?: Message[]
}

export interface ConversationAssignment {
  id: string
  conversationId: string
  userId: string
  assignedAt: string
  isActive: boolean
  user?: User
}

export interface Message {
  id: string
  conversationId: string
  senderId?: string
  senderType: SenderType
  type: MessageType
  content: string
  mediaUrl?: string
  mediaType?: string
  status: MessageStatus
  whatsappId?: string
  isBot: boolean
  isPrivate: boolean
  metadata?: string
  createdAt: string
  readAt?: string
  sender?: User
}

export interface QuickReply {
  id: string
  title: string
  content: string
  shortcut?: string
  userId?: string
}

export interface BotConfig {
  id: string
  name: string
  isActive: boolean
  welcomeMsg?: string
  fallbackMsg?: string
  transferMsg?: string
  autoTransfer: boolean
  transferDelay: number
  aiEnabled: boolean
  aiPrompt?: string
  flows?: BotFlow[]
}

export interface BotFlow {
  id: string
  trigger: string
  response: string
  action?: string
  actionData?: string
  order: number
}

export interface BulkCampaign {
  id: string
  name: string
  message: string
  status: CampaignStatus
  totalCount: number
  sentCount: number
  failedCount: number
  scheduledAt?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
}

export interface Webhook {
  id: string
  name: string
  url: string
  secret?: string
  events: string[]
  isActive: boolean
  createdAt: string
}

export interface ReportMetrics {
  totalConversations: number
  closedConversations: number
  avgResponseTime: number
  avgWaitTime: number
  messagesSent: number
  messagesReceived: number
  agentRanking: AgentRankItem[]
  teamStats: TeamStatItem[]
  conversationsByDay: DailyStatItem[]
  conversionRate: number
}

export interface AgentRankItem {
  userId: string
  name: string
  avatar?: string
  closedConversations: number
  avgResponseTime: number
  messagesSent: number
}

export interface TeamStatItem {
  teamId: string
  teamName: string
  color: string
  conversations: number
}

export interface DailyStatItem {
  date: string
  count: number
}

// ─── API RESPONSE TYPES ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── WEBSOCKET EVENTS ─────────────────────────────────────────────────────────

export type SocketEvent =
  | 'new_message'
  | 'message_status_update'
  | 'conversation_update'
  | 'conversation_assigned'
  | 'agent_status_change'
  | 'typing_indicator'
  | 'notification'

export interface SocketPayload {
  event: SocketEvent
  data: unknown
}

// ─── FILTER TYPES ─────────────────────────────────────────────────────────────

export interface ConversationFilters {
  status?: ConversationStatus | 'ALL'
  teamId?: string
  agentId?: string
  tagId?: string
  search?: string
  page?: number
  pageSize?: number
}

export interface AuthSession {
  userId: string
  email: string
  name: string
  role: UserRole
  token: string
}
