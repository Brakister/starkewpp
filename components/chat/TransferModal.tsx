'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, Users, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Team, User as UserType } from '@/types'

interface TransferModalProps {
  conversationId: string
  onClose: () => void
  onTransferred: () => void
}

export function TransferModal({ conversationId, onClose, onTransferred }: TransferModalProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [agents, setAgents] = useState<UserType[]>([])
  const [mode, setMode] = useState<'team' | 'agent'>('team')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [transferring, setTransferring] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/teams').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([td, ud]) => {
      if (td.success) setTeams(td.data)
      if (ud.success) setAgents(ud.data.items.filter((u: UserType) => u.status !== 'OFFLINE'))
    }).finally(() => setLoading(false))
  }, [])

  const handleTransfer = async () => {
    if (!selectedId) return
    setTransferring(true)
    try {
      if (mode === 'team') {
        const res = await fetch(`/api/conversations/${conversationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: selectedId, status: 'WAITING' })
        })
        const data = await res.json()
        if (data.success) { toast.success('Conversa transferida para o time!'); onTransferred() }
      } else {
        const res = await fetch(`/api/conversations/${conversationId}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: selectedId })
        })
        const data = await res.json()
        if (data.success) { toast.success('Conversa atribuída ao atendente!'); onTransferred() }
      }
    } finally {
      setTransferring(false)
    }
  }

  const STATUS_COLORS = { ONLINE: 'bg-emerald-400', BUSY: 'bg-amber-400', OFFLINE: 'bg-gray-600' }
  const STATUS_LABELS = { ONLINE: 'Online', BUSY: 'Ocupado', OFFLINE: 'Offline' }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#0d0f18] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            Transferir Conversa
          </h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
            {[
              { id: 'team' as const, label: 'Para um Time', icon: Users },
              { id: 'agent' as const, label: 'Para Atendente', icon: User },
            ].map(opt => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.id}
                  onClick={() => { setMode(opt.id); setSelectedId(null) }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
                    mode === opt.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* List */}
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-11 rounded-xl bg-white/5 animate-pulse" />
              ))
            ) : mode === 'team' ? (
              teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => setSelectedId(team.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                    selectedId === team.id
                      ? 'bg-emerald-500/15 border border-emerald-500/30'
                      : 'hover:bg-white/5 border border-transparent'
                  )}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm"
                    style={{ background: `${team.color}30`, color: team.color }}>
                    {team.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-200">{team.name}</p>
                    <p className="text-xs text-gray-600">{team.members?.length || 0} membros</p>
                  </div>
                  {selectedId === team.id && (
                    <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-white text-[10px]">✓</span>
                    </div>
                  )}
                </button>
              ))
            ) : (
              agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedId(agent.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                    selectedId === agent.id
                      ? 'bg-emerald-500/15 border border-emerald-500/30'
                      : 'hover:bg-white/5 border border-transparent'
                  )}
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-300">
                      {agent.name.charAt(0)}
                    </div>
                    <span className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0d0f18]',
                      STATUS_COLORS[agent.status]
                    )} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-200">{agent.name}</p>
                    <p className={cn('text-xs', agent.status === 'ONLINE' ? 'text-emerald-500' : 'text-amber-400')}>
                      {STATUS_LABELS[agent.status]}
                    </p>
                  </div>
                  {selectedId === agent.id && (
                    <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-white text-[10px]">✓</span>
                    </div>
                  )}
                </button>
              ))
            )}

            {!loading && mode === 'team' && teams.length === 0 && (
              <p className="text-xs text-gray-700 text-center py-4">Nenhum time cadastrado</p>
            )}
            {!loading && mode === 'agent' && agents.length === 0 && (
              <p className="text-xs text-gray-700 text-center py-4">Nenhum atendente disponível</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-400 text-sm hover:bg-white/8 transition-all">
              Cancelar
            </button>
            <button
              onClick={handleTransfer}
              disabled={!selectedId || transferring}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {transferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Transferir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
