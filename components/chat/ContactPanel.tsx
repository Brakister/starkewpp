'use client'

import { useState } from 'react'
import {
  Phone, Mail, StickyNote, Tag, User, Building2, Clock,
  Edit3, ChevronDown, ChevronRight, ExternalLink, UserMinus
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types'

interface ContactPanelProps {
  conversation: Conversation
  onUpdate?: () => void
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Aberta', color: 'text-blue-400 bg-blue-400/10' },
  IN_PROGRESS: { label: 'Em Atendimento', color: 'text-amber-400 bg-amber-400/10' },
  WAITING: { label: 'Aguardando', color: 'text-purple-400 bg-purple-400/10' },
  CLOSED: { label: 'Finalizada', color: 'text-gray-400 bg-gray-400/10' },
}

export function ContactPanel({ conversation, onUpdate }: ContactPanelProps) {
  const [openSection, setOpenSection] = useState<string>('info')
  const contact = conversation.contact

  if (!contact) return null

  const toggleSection = (key: string) =>
    setOpenSection(prev => (prev === key ? '' : key))

  const closeConversation = async () => {
    await fetch(`/api/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CLOSED' })
    })
    onUpdate?.()
  }

  const assumeConversation = async () => {
    await fetch(`/api/conversations/${conversation.id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    onUpdate?.()
  }

  const editContact = () => {
    window.location.href = `/contacts?edit=${contact.id}`
  }

  const statusInfo = STATUS_LABEL[conversation.status]

  return (
    <div className="w-72 flex flex-col h-full bg-[#0a0c10] border-l border-white/5 overflow-y-auto">
      {/* Contact Header */}
      <div className="p-4 border-b border-white/5 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/50 to-purple-700/50 border-2 border-white/10 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3">
          {(contact.name || contact.phone).charAt(0).toUpperCase()}
        </div>
        <h3 className="font-semibold text-white text-sm">{contact.name || 'Sem nome'}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{contact.phone}</p>

        <div className="flex items-center justify-center gap-2 mt-3">
          <span className={cn('text-[11px] px-2.5 py-1 rounded-full font-medium', statusInfo?.color)}>
            {statusInfo?.label}
          </span>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={assumeConversation}
            className="flex-1 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-all"
          >
            Assumir
          </button>
          <button
            onClick={closeConversation}
            className="flex-1 py-2 rounded-xl bg-white/5 text-gray-400 text-xs font-medium hover:bg-white/8 transition-all"
          >
            Finalizar
          </button>
        </div>
      </div>

      {/* Assignment */}
      {conversation.assignments && conversation.assignments.length > 0 && (
        <div className="px-4 py-3 border-b border-white/5">
          <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-2 font-medium">Atendente</p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-600/30 flex items-center justify-center text-xs font-bold text-emerald-400 border border-white/10">
              {conversation.assignments[0].user?.name?.charAt(0)}
            </div>
            <div>
              <p className="text-xs text-gray-200 font-medium">{conversation.assignments[0].user?.name}</p>
              <p className="text-[10px] text-gray-600">Desde {format(new Date(conversation.assignments[0].assignedAt), 'dd/MM', { locale: ptBR })}</p>
            </div>
            <button className="ml-auto text-gray-600 hover:text-red-400 transition-colors">
              <UserMinus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Team */}
      {conversation.team && (
        <div className="px-4 py-3 border-b border-white/5">
          <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-2 font-medium">Time</p>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: conversation.team.color }} />
            <span className="text-xs text-gray-200">{conversation.team.name}</span>
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-gray-600 uppercase tracking-wider font-medium">Etiquetas</p>
          <button className="text-gray-600 hover:text-emerald-400 transition-colors">
            <Tag className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {conversation.tags && conversation.tags.length > 0 ? (
            conversation.tags.map(ct => (
              <span
                key={ct.tag?.id}
                className="text-[11px] px-2 py-0.5 rounded-md font-medium"
                style={{ background: `${ct.tag?.color}20`, color: ct.tag?.color }}
              >
                {ct.tag?.name}
              </span>
            ))
          ) : (
            <p className="text-xs text-gray-700">Nenhuma etiqueta</p>
          )}
        </div>
      </div>

      {/* Collapsible: Contact Info */}
      <CollapsibleSection
        title="Informações do Contato"
        isOpen={openSection === 'info'}
        onToggle={() => toggleSection('info')}
      >
        <div className="space-y-3">
          {contact.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-gray-600 shrink-0" />
              <span className="text-xs text-gray-300 truncate">{contact.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-gray-600 shrink-0" />
            <span className="text-xs text-gray-300">{contact.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
            <span className="text-xs text-gray-500">
              Cliente desde {format(new Date(contact.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>
          {contact.notes && (
            <div className="flex items-start gap-2">
              <StickyNote className="w-3.5 h-3.5 text-gray-600 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400 leading-relaxed">{contact.notes}</p>
            </div>
          )}
          <button
            onClick={editContact}
            className="w-full flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors mt-1"
          >
            <Edit3 className="w-3 h-3" />
            Editar contato
          </button>
        </div>
      </CollapsibleSection>

      {/* Collapsible: Conversation History */}
      <CollapsibleSection
        title="Histórico"
        isOpen={openSection === 'history'}
        onToggle={() => toggleSection('history')}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Total de atendimentos</span>
            <span className="text-gray-200 font-medium">—</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Primeiro contato</span>
            <span className="text-gray-200">{format(new Date(contact.createdAt), 'dd/MM/yy')}</span>
          </div>
          <button className="w-full flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mt-2">
            <ExternalLink className="w-3 h-3" />
            Ver histórico completo
          </button>
        </div>
      </CollapsibleSection>

      {/* Collapsible: Quick Replies */}
      <CollapsibleSection
        title="Respostas Rápidas"
        isOpen={openSection === 'quick'}
        onToggle={() => toggleSection('quick')}
      >
        <QuickRepliesPanel conversationId={conversation.id} />
      </CollapsibleSection>
    </div>
  )
}

// ─── QUICK REPLIES ────────────────────────────────────────────────────────────

function QuickRepliesPanel({ conversationId }: { conversationId: string }) {
  const [quickReplies] = useState([
    { id: '1', title: 'Boas-vindas', content: 'Olá! Seja bem-vindo(a). Como posso ajudar?' },
    { id: '2', title: 'Aguarde', content: 'Por favor, aguarde um momento enquanto verifico.' },
    { id: '3', title: 'Encerramento', content: 'Obrigado pelo contato! Ficamos à disposição.' },
  ])

  const sendQuickReply = async (content: string) => {
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, content, type: 'TEXT' })
    })
  }

  return (
    <div className="space-y-1.5">
      {quickReplies.map(qr => (
        <button
          key={qr.id}
          onClick={() => sendQuickReply(qr.content)}
          className="w-full text-left p-2.5 rounded-lg bg-white/3 hover:bg-white/6 border border-white/5 transition-all group"
        >
          <p className="text-xs font-medium text-gray-300 group-hover:text-white mb-0.5">{qr.title}</p>
          <p className="text-[11px] text-gray-600 truncate">{qr.content}</p>
        </button>
      ))}
    </div>
  )
}

// ─── COLLAPSIBLE SECTION ──────────────────────────────────────────────────────

function CollapsibleSection({
  title, isOpen, onToggle, children
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-white/5">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-all"
      >
        <span className="text-[11px] text-gray-600 uppercase tracking-wider font-medium">{title}</span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-3">
          {children}
        </div>
      )}
    </div>
  )
}
