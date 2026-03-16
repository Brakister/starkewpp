'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Edit3, Trash2, UserPlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Team, User } from '@/types'

const TEAM_COLORS = [
  '#10b981', '#6366f1', '#f59e0b', '#ef4444',
  '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16'
]

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Team | null>(null)
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/teams').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([teamsData, usersData]) => {
      if (teamsData.success) setTeams(teamsData.data)
      if (usersData.success) setUsers(usersData.data.items)
    }).finally(() => setLoading(false))
  }, [])

  const deleteTeam = async (id: string) => {
    if (!confirm('Excluir este time?')) return
    await fetch(`/api/teams/${id}`, { method: 'DELETE' })
    setTeams(prev => prev.filter(t => t.id !== id))
    toast.success('Time excluído')
  }

  const addMember = async (teamId: string, userId: string) => {
    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
    const data = await res.json()
    if (data.success) {
      const user = users.find(u => u.id === userId)
      setTeams(prev => prev.map(t => t.id === teamId ? {
        ...t,
        members: [...(t.members || []), { id: data.data.id, teamId, userId, role: 'member', user }]
      } : t))
      toast.success('Membro adicionado')
    }
  }

  const removeMember = async (teamId: string, userId: string) => {
    await fetch(`/api/teams/${teamId}/members/${userId}`, { method: 'DELETE' })
    setTeams(prev => prev.map(t => t.id === teamId ? {
      ...t,
      members: (t.members || []).filter(m => m.userId !== userId)
    } : t))
    toast.success('Membro removido')
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Times & Departamentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Organize sua equipe por setores</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Novo Time
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-white/3 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => {
            const isExpanded = expandedTeam === team.id
            const memberCount = team.members?.length || 0
            const nonMembers = users.filter(u => !team.members?.find(m => m.userId === u.id))

            return (
              <div key={team.id} className="bg-[#0d0f18] border border-white/5 rounded-2xl overflow-hidden">
                {/* Team header */}
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                        style={{ background: `${team.color}30`, border: `1px solid ${team.color}40` }}
                      >
                        <span style={{ color: team.color }}>{team.name.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm">{team.name}</h3>
                        {team.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{team.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditing(team); setShowModal(true) }}
                        className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-600 hover:text-white transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteTeam(team.id)}
                        className="w-7 h-7 rounded-lg hover:bg-red-400/10 flex items-center justify-center text-gray-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Users className="w-3.5 h-3.5" />
                      {memberCount} {memberCount === 1 ? 'membro' : 'membros'}
                    </div>
                    <div className="flex -space-x-1.5">
                      {team.members?.slice(0, 4).map(m => (
                        <div
                          key={m.id}
                          className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500/50 to-purple-700/50 border border-[#0d0f18] flex items-center justify-center text-[10px] font-bold text-white"
                          title={m.user?.name}
                        >
                          {m.user?.name?.charAt(0) || '?'}
                        </div>
                      ))}
                      {memberCount > 4 && (
                        <div className="w-6 h-6 rounded-full bg-white/10 border border-[#0d0f18] flex items-center justify-center text-[10px] text-gray-400">
                          +{memberCount - 4}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Members list */}
                <div className="p-3 space-y-1.5">
                  {team.members?.slice(0, isExpanded ? undefined : 3).map(m => (
                    <div key={m.id} className="flex items-center gap-2 group">
                      <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-400">
                        {m.user?.name?.charAt(0)}
                      </div>
                      <span className="text-xs text-gray-300 flex-1 truncate">{m.user?.name}</span>
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded',
                        m.user?.status === 'ONLINE' ? 'bg-emerald-500/15 text-emerald-400' :
                        m.user?.status === 'BUSY' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-gray-500/15 text-gray-500'
                      )}>
                        {m.user?.status === 'ONLINE' ? 'Online' : m.user?.status === 'BUSY' ? 'Ocupado' : 'Offline'}
                      </span>
                      <button
                        onClick={() => removeMember(team.id, m.userId)}
                        className="w-5 h-5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-400/10 flex items-center justify-center text-gray-600 hover:text-red-400 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {memberCount > 3 && (
                    <button
                      onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                      className="text-xs text-gray-600 hover:text-gray-400 transition-colors py-1"
                    >
                      {isExpanded ? 'Ver menos' : `+${memberCount - 3} mais`}
                    </button>
                  )}

                  {/* Add member dropdown */}
                  {nonMembers.length > 0 && (
                    <div className="pt-1">
                      <select
                        className="w-full bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-emerald-500/40 transition-all"
                        onChange={e => { if (e.target.value) { addMember(team.id, e.target.value); e.target.value = '' } }}
                        defaultValue=""
                      >
                        <option value="" disabled>+ Adicionar membro</option>
                        {nonMembers.map(u => (
                          <option key={u.id} value={u.id} className="bg-[#1a1d27]">{u.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {teams.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-12 h-12 text-gray-700 mb-3" />
              <p className="text-sm text-gray-500">Nenhum time criado ainda</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <TeamModal
          team={editing}
          onClose={() => setShowModal(false)}
          onSave={(team) => {
            if (editing) {
              setTeams(prev => prev.map(t => t.id === team.id ? team : t))
            } else {
              setTeams(prev => [...prev, team])
            }
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

function TeamModal({ team, onClose, onSave }: { team: Team | null; onClose: () => void; onSave: (t: Team) => void }) {
  const [form, setForm] = useState({
    name: team?.name || '',
    description: team?.description || '',
    color: team?.color || '#10b981',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = team ? `/api/teams/${team.id}` : '/api/teams'
      const res = await fetch(url, {
        method: team ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        toast.success(team ? 'Time atualizado!' : 'Time criado!')
        onSave(data.data)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d0f18] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white">{team ? 'Editar Time' : 'Novo Time'}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Nome *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/40 transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Descrição</label>
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/40 transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {TEAM_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={cn('w-7 h-7 rounded-lg transition-all', form.color === c && 'ring-2 ring-white/40 ring-offset-2 ring-offset-[#0d0f18]')}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-400 text-sm hover:bg-white/8 transition-all">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
