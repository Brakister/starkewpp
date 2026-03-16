'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit3, Trash2, Shield, User, BarChart3, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import type { User as UserType, UserRole } from '@/types'

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: React.ElementType }> = {
  AGENT: { label: 'Atendente', color: 'text-blue-400 bg-blue-400/10', icon: User },
  MANAGER: { label: 'Gestor', color: 'text-amber-400 bg-amber-400/10', icon: BarChart3 },
  ADMIN: { label: 'Administrador', color: 'text-purple-400 bg-purple-400/10', icon: Shield },
}

const STATUS_DOT: Record<string, string> = {
  ONLINE: 'fill-emerald-400 text-emerald-400',
  BUSY: 'fill-amber-400 text-amber-400',
  OFFLINE: 'fill-gray-600 text-gray-600',
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<UserType | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    const res = await fetch('/api/users')
    const data = await res.json()
    if (data.success) setUsers(data.data.items)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const toggleActive = async (user: UserType) => {
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive })
    })
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u))
    toast.success(user.isActive ? 'Usuário desativado' : 'Usuário ativado')
  }

  const deleteUser = async (id: string) => {
    if (!confirm('Excluir este usuário permanentemente?')) return
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    setUsers(prev => prev.filter(u => u.id !== id))
    toast.success('Usuário excluído')
  }

  const onlineCount = users.filter(u => u.status === 'ONLINE').length
  const agentCount = users.filter(u => u.role === 'AGENT').length

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {users.length} usuários · {onlineCount} online · {agentCount} atendentes
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {(['AGENT', 'MANAGER', 'ADMIN'] as UserRole[]).map(role => {
          const cfg = ROLE_CONFIG[role]
          const count = users.filter(u => u.role === role).length
          const Icon = cfg.icon
          return (
            <div key={role} className="bg-[#0d0f18] border border-white/5 rounded-xl p-3 flex items-center gap-3">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', cfg.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{count}</p>
                <p className="text-xs text-gray-600">{cfg.label}s</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Users table */}
      <div className="bg-[#0d0f18] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium">Usuário</th>
              <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium hidden md:table-cell">Perfil</th>
              <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium hidden lg:table-cell">Status</th>
              <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium hidden md:table-cell">Criado em</th>
              <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium">Ativo</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-white/3">
                  {[...Array(5)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : users.map(user => {
              const roleCfg = ROLE_CONFIG[user.role]
              const RoleIcon = roleCfg.icon
              return (
                <tr key={user.id} className="border-b border-white/3 hover:bg-white/2 transition-all group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-700/30 flex items-center justify-center text-sm font-bold text-violet-300 border border-white/10">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">{user.name}</p>
                        <p className="text-xs text-gray-600">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn('flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg w-fit', roleCfg.color)}>
                      <RoleIcon className="w-3 h-3" />
                      {roleCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Circle className={cn('w-2 h-2', STATUS_DOT[user.status])} />
                      <span className="text-xs text-gray-400">
                        {user.status === 'ONLINE' ? 'Online' : user.status === 'BUSY' ? 'Ocupado' : 'Offline'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">
                    {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(user)}
                      className={cn(
                        'w-10 h-5 rounded-full transition-all relative',
                        user.isActive ? 'bg-emerald-500' : 'bg-white/10'
                      )}
                    >
                      <div className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm',
                        user.isActive ? 'left-[22px]' : 'left-0.5'
                      )} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => { setEditing(user); setShowModal(true) }}
                        className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-600 hover:text-white transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="w-7 h-7 rounded-lg hover:bg-red-400/10 flex items-center justify-center text-gray-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <UserModal
          user={editing}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchUsers() }}
        />
      )}
    </div>
  )
}

function UserModal({ user, onClose, onSave }: { user: UserType | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'AGENT' as UserRole,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = user ? `/api/users/${user.id}` : '/api/users'
      const body = user ? { name: form.name, role: form.role, ...(form.password && { password: form.password }) } : form
      const res = await fetch(url, {
        method: user ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.success) {
        toast.success(user ? 'Usuário atualizado!' : 'Usuário criado!')
        onSave()
      } else {
        toast.error(data.error || 'Erro ao salvar')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d0f18] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white">{user ? 'Editar Usuário' : 'Novo Usuário'}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {[
            { field: 'name', label: 'Nome *', type: 'text', required: true },
            { field: 'email', label: 'E-mail *', type: 'email', required: true },
            { field: 'password', label: user ? 'Nova senha (deixe em branco para manter)' : 'Senha *', type: 'password', required: !user },
          ].map(({ field, label, type, required }) => (
            <div key={field}>
              <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
              <input
                type={type}
                value={form[field as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                required={required}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/40 transition-all"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Perfil</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/40 transition-all"
            >
              <option value="AGENT" className="bg-[#1a1d27]">Atendente</option>
              <option value="MANAGER" className="bg-[#1a1d27]">Gestor</option>
              <option value="ADMIN" className="bg-[#1a1d27]">Administrador</option>
            </select>
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
