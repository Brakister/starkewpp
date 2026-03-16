'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit3, Trash2, Zap, Search, Copy, Globe, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { QuickReply } from '@/types'

export default function QuickRepliesPage() {
  const [replies, setReplies] = useState<QuickReply[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<QuickReply | null>(null)

  const fetchReplies = async () => {
    setLoading(true)
    const res = await fetch('/api/quick-replies')
    const data = await res.json()
    if (data.success) setReplies(data.data)
    setLoading(false)
  }

  useEffect(() => { fetchReplies() }, [])

  const filtered = replies.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.content.toLowerCase().includes(search.toLowerCase()) ||
    r.shortcut?.toLowerCase().includes(search.toLowerCase())
  )

  const deleteReply = async (id: string) => {
    await fetch(`/api/quick-replies/${id}`, { method: 'DELETE' })
    setReplies(prev => prev.filter(r => r.id !== id))
    toast.success('Resposta removida')
  }

  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Copiado!')
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Respostas Rápidas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Templates de mensagens para agilizar o atendimento</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nova Resposta
        </button>
      </div>

      {/* Tip */}
      <div className="flex items-start gap-3 p-3.5 bg-blue-500/8 border border-blue-500/20 rounded-xl">
        <Zap className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-blue-400 mb-0.5">Como usar no chat</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            No campo de mensagem, digite <code className="bg-white/5 px-1 rounded text-blue-300">/</code> seguido do atalho
            (ex: <code className="bg-white/5 px-1 rounded text-blue-300">/ola</code>) para inserir automaticamente.
            Ou clique no ícone <Zap className="w-3 h-3 inline mx-0.5" /> no chat.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por título, conteúdo ou atalho..."
          className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40 transition-all"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-white/3 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Zap className="w-12 h-12 text-gray-700 mb-3" />
          <p className="text-sm text-gray-500">
            {search ? 'Nenhuma resposta encontrada' : 'Nenhuma resposta rápida criada'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(reply => (
            <div
              key={reply.id}
              className="bg-[#0d0f18] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 group hover:border-white/10 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{reply.title}</p>
                    {reply.shortcut && (
                      <code className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        /{reply.shortcut}
                      </code>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <button
                    onClick={() => copyContent(reply.content)}
                    className="w-6 h-6 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-600 hover:text-white transition-all"
                    title="Copiar"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => { setEditing(reply); setShowModal(true) }}
                    className="w-6 h-6 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-600 hover:text-white transition-all"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteReply(reply.id)}
                    className="w-6 h-6 rounded-lg hover:bg-red-400/10 flex items-center justify-center text-gray-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 flex-1">
                {reply.content}
              </p>

              <div className="flex items-center gap-1.5 mt-auto">
                {reply.userId ? (
                  <span className="flex items-center gap-1 text-[10px] text-gray-700">
                    <User className="w-3 h-3" /> Pessoal
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-gray-700">
                    <Globe className="w-3 h-3" /> Global
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <QuickReplyModal
          reply={editing}
          onClose={() => setShowModal(false)}
          onSave={(saved) => {
            if (editing) {
              setReplies(prev => prev.map(r => r.id === saved.id ? saved : r))
            } else {
              setReplies(prev => [saved, ...prev])
            }
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

function QuickReplyModal({
  reply, onClose, onSave
}: {
  reply: QuickReply | null
  onClose: () => void
  onSave: (r: QuickReply) => void
}) {
  const [form, setForm] = useState({
    title: reply?.title || '',
    content: reply?.content || '',
    shortcut: reply?.shortcut || '',
    isGlobal: !reply?.userId,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = reply ? `/api/quick-replies/${reply.id}` : '/api/quick-replies'
      const res = await fetch(url, {
        method: reply ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        toast.success(reply ? 'Resposta atualizada!' : 'Resposta criada!')
        onSave(data.data)
      } else {
        toast.error(data.error || 'Erro ao salvar')
      }
    } finally {
      setSaving(false)
    }
  }

  const VARIABLES = ['{{name}}', '{{phone}}', '{{agent}}', '{{company}}']

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d0f18] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white">{reply ? 'Editar Resposta' : 'Nova Resposta Rápida'}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Título *</label>
            <input
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required placeholder="Ex: Boas-vindas"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-emerald-500/40 transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Atalho</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">/</span>
              <input
                value={form.shortcut} onChange={e => setForm(f => ({ ...f, shortcut: e.target.value.replace(/[^a-z0-9]/g, '') }))}
                placeholder="ola (sem espaços)"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-6 pr-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-emerald-500/40 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-500">Conteúdo *</label>
              <div className="flex gap-1">
                {VARIABLES.map(v => (
                  <button
                    key={v} type="button"
                    onClick={() => setForm(f => ({ ...f, content: f.content + v }))}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-all font-mono"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              required rows={5}
              placeholder="Olá {{name}}! Como posso ajudar?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-emerald-500/40 transition-all resize-none"
            />
            <p className="text-[10px] text-gray-700 mt-1">{form.content.length} caracteres</p>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <div>
              <p className="text-sm text-gray-300">Disponível para todos</p>
              <p className="text-xs text-gray-600 mt-0.5">Resposta global visível para toda a equipe</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, isGlobal: !f.isGlobal }))}
              className={cn('w-10 h-5 rounded-full transition-all relative', form.isGlobal ? 'bg-emerald-500' : 'bg-white/10')}
            >
              <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm', form.isGlobal ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-400 text-sm hover:bg-white/8 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
