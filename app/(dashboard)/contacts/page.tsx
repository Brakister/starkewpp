'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Search, Plus, Phone, Mail, Tag, MoreVertical, User,
  MessageSquare, Trash2, Edit3, Filter, Download
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { formatPhone } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Contact } from '@/types'

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/contacts?${params}`)
      const data = await res.json()
      if (data.success) setContacts(data.data.items)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = setTimeout(fetchContacts, 300)
    return () => clearTimeout(t)
  }, [fetchContacts])

  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId) return
    const load = async () => {
      try {
        const res = await fetch(`/api/contacts/${editId}`)
        const data = await res.json()
        if (data.success && data.data) {
          setEditing(data.data)
          setShowModal(true)
        }
      } catch {}
    }
    load()
  }, [searchParams])

  const deleteContact = async (id: string) => {
    if (!confirm('Excluir este contato?')) return
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    setContacts(prev => prev.filter(c => c.id !== id))
    toast.success('Contato excluído')
  }

  const openConversation = async (contactId: string) => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId })
    })
    const data = await res.json()
    if (data.success) {
      window.location.href = `/conversations?id=${data.data.id}`
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Contatos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{contacts.length} contatos cadastrados</p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 px-3 py-2 bg-white/5 text-gray-400 rounded-xl text-sm hover:bg-white/8 transition-all border border-white/8"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:block">Exportar</span>
          </button>
          <button
            onClick={() => { setEditing(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Novo Contato
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-[#0d0f18] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium">Contato</th>
              <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium hidden md:table-cell">Telefone</th>
              <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium hidden lg:table-cell">E-mail</th>
              <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium hidden lg:table-cell">Etiquetas</th>
              <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium hidden md:table-cell">Cadastro</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-white/3">
                  {[...Array(5)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-white/5 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-600 text-sm">
                  Nenhum contato encontrado
                </td>
              </tr>
            ) : (
              contacts.map(contact => (
                <tr key={contact.id} className="border-b border-white/3 hover:bg-white/2 transition-all group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-700/30 flex items-center justify-center text-xs font-bold text-violet-300 border border-white/10 shrink-0">
                        {(contact.name || contact.phone).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">{contact.name || '—'}</p>
                        <p className="text-xs text-gray-600 md:hidden">{formatPhone(contact.phone)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-gray-600" />
                      {formatPhone(contact.phone)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                    {contact.email ? (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-gray-600" />
                        {contact.email}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {contact.tags?.slice(0, 3).map(ct => (
                        <span
                          key={ct.tag?.id}
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: `${ct.tag?.color}20`, color: ct.tag?.color }}
                        >
                          {ct.tag?.name}
                        </span>
                      ))}
                      {(!contact.tags || contact.tags.length === 0) && (
                        <span className="text-xs text-gray-700">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">
                    {format(new Date(contact.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === contact.id ? null : contact.id)}
                        className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {menuOpen === contact.id && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-[#1a1d27] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                          <button
                            onClick={() => { openConversation(contact.id); setMenuOpen(null) }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Nova conversa
                          </button>
                          <button
                            onClick={() => { setEditing(contact); setShowModal(true); setMenuOpen(null) }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button
                            onClick={() => { deleteContact(contact.id); setMenuOpen(null) }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <ContactModal
          contact={editing}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchContacts() }}
        />
      )}
    </div>
  )
}

// ─── CONTACT MODAL ────────────────────────────────────────────────────────────

function ContactModal({
  contact, onClose, onSave
}: {
  contact: Contact | null
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState({
    name: contact?.name || '',
    phone: contact?.phone || '',
    email: contact?.email || '',
    notes: contact?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = contact ? `/api/contacts/${contact.id}` : '/api/contacts'
      const method = contact ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        toast.success(contact ? 'Contato atualizado!' : 'Contato criado!')
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
      <div className="bg-[#0d0f18] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white">{contact ? 'Editar Contato' : 'Novo Contato'}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors text-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {(['name', 'phone', 'email', 'notes'] as const).map(field => (
            <div key={field}>
              <label className="text-xs text-gray-500 mb-1.5 block capitalize">
                {field === 'name' ? 'Nome' : field === 'phone' ? 'Telefone *' : field === 'email' ? 'E-mail' : 'Observações'}
              </label>
              {field === 'notes' ? (
                <textarea
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40 resize-none transition-all"
                />
              ) : (
                <input
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  required={field === 'phone'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40 transition-all"
                />
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-400 text-sm hover:bg-white/8 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
