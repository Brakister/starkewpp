'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit3, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Tag as TagType } from '@/types'

const PRESET_COLORS = [
  '#10b981', '#6366f1', '#f59e0b', '#ef4444',
  '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16',
  '#f97316', '#14b8a6', '#a855f7', '#3b82f6',
]

export default function TagsPage() {
  const [tags, setTags] = useState<TagType[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<TagType | null>(null)

  const fetchTags = async () => {
    setLoading(true)
    const res = await fetch('/api/tags')
    const data = await res.json()
    if (data.success) setTags(data.data)
    setLoading(false)
  }

  useEffect(() => { fetchTags() }, [])

  const deleteTag = async (id: string) => {
    if (!confirm('Excluir esta etiqueta? Ela será removida de todas as conversas.')) return
    await fetch(`/api/tags/${id}`, { method: 'DELETE' })
    setTags(prev => prev.filter(t => t.id !== id))
    toast.success('Etiqueta excluída')
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Etiquetas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Organize conversas e contatos com tags coloridas</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nova Etiqueta
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/3 animate-pulse" />)}
        </div>
      ) : tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Tag className="w-12 h-12 text-gray-700 mb-3" />
          <p className="text-sm text-gray-500">Nenhuma etiqueta criada</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="bg-[#0d0f18] border border-white/5 rounded-xl p-3.5 flex items-center justify-between group hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: tag.color }} />
                <span
                  className="text-sm font-medium px-2 py-0.5 rounded-lg truncate"
                  style={{ background: `${tag.color}20`, color: tag.color }}
                >
                  {tag.name}
                </span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all ml-2 shrink-0">
                <button
                  onClick={() => { setEditing(tag); setShowModal(true) }}
                  className="w-6 h-6 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-600 hover:text-white transition-all"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deleteTag(tag.id)}
                  className="w-6 h-6 rounded-lg hover:bg-red-400/10 flex items-center justify-center text-gray-600 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TagModal
          tag={editing}
          onClose={() => setShowModal(false)}
          onSave={(saved) => {
            if (editing) setTags(prev => prev.map(t => t.id === saved.id ? saved : t))
            else setTags(prev => [...prev, saved])
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

function TagModal({ tag, onClose, onSave }: { tag: TagType | null; onClose: () => void; onSave: (t: TagType) => void }) {
  const [form, setForm] = useState({ name: tag?.name || '', color: tag?.color || '#10b981' })
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(form.name || 'Preview')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = tag ? `/api/tags/${tag.id}` : '/api/tags'
      const res = await fetch(url, {
        method: tag ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        toast.success(tag ? 'Etiqueta atualizada!' : 'Etiqueta criada!')
        onSave(data.data)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d0f18] border border-white/10 rounded-2xl w-full max-w-xs shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white">{tag ? 'Editar Etiqueta' : 'Nova Etiqueta'}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Preview */}
          <div className="flex items-center justify-center py-3">
            <span
              className="text-sm font-semibold px-4 py-2 rounded-xl"
              style={{ background: `${form.color}25`, color: form.color, border: `1px solid ${form.color}40` }}
            >
              {form.name || 'Preview'}
            </span>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Nome *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required maxLength={24}
              placeholder="Ex: VIP, Urgente, Novo Cliente..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-emerald-500/40 transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Cor</label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={cn(
                    'w-8 h-8 rounded-lg transition-all',
                    form.color === c ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-[#0d0f18] scale-110' : 'hover:scale-105'
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="mt-3">
              <label className="text-xs text-gray-600 mb-1 block">Cor personalizada</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                />
                <input
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  placeholder="#10b981"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-emerald-500/40 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
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
