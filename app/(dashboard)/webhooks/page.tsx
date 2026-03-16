'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Copy, Eye, EyeOff, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Webhook } from '@/types'

const ALL_EVENTS = [
  { value: 'new_message', label: '💬 Nova mensagem' },
  { value: 'conversation_started', label: '🆕 Conversa iniciada' },
  { value: 'conversation_closed', label: '✅ Conversa finalizada' },
  { value: 'conversation_assigned', label: '👤 Atribuição de conversa' },
  { value: 'contact_assigned', label: '📋 Cliente atribuído' },
]

interface WebhookWithLogs extends Webhook {
  logs?: Array<{ id: string; event: string; success: boolean; statusCode?: number; createdAt: string }>
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookWithLogs[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/webhooks').then(r => r.json()).then(data => {
      if (data.success) setWebhooks(data.data)
    }).finally(() => setLoading(false))
  }, [])

  const toggleWebhook = async (webhook: WebhookWithLogs) => {
    await fetch(`/api/webhooks/${webhook.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !webhook.isActive })
    })
    setWebhooks(prev => prev.map(w => w.id === webhook.id ? { ...w, isActive: !w.isActive } : w))
  }

  const deleteWebhook = async (id: string) => {
    if (!confirm('Excluir este webhook?')) return
    await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
    setWebhooks(prev => prev.filter(w => w.id !== id))
    toast.success('Webhook excluído')
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('URL copiada!')
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Webhooks</h1>
          <p className="text-sm text-gray-500 mt-0.5">Integre com CRMs, ERPs e automações externas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Novo Webhook
        </button>
      </div>

      {/* Info box */}
      <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-4">
        <p className="text-xs font-medium text-blue-400 mb-1">Como verificar autenticidade</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Cada requisição inclui o header <code className="text-blue-300 bg-white/5 px-1 rounded">X-ZapFlow-Signature</code> com
          um HMAC SHA-256 do payload. Verifique com seu secret para garantir que veio do ZapFlow.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/3 animate-pulse" />)}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ExternalLink className="w-12 h-12 text-gray-700 mb-3" />
          <p className="text-sm text-gray-500">Nenhum webhook configurado</p>
          <p className="text-xs text-gray-700 mt-1">Crie um webhook para integrar com sistemas externos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(webhook => (
            <div key={webhook.id} className="bg-[#0d0f18] border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white">{webhook.name}</h3>
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium',
                        webhook.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-500/15 text-gray-500'
                      )}>
                        {webhook.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-lg truncate max-w-xs">
                        {webhook.url}
                      </code>
                      <button onClick={() => copyUrl(webhook.url)} className="text-gray-600 hover:text-gray-300 transition-colors">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {webhook.events.map(ev => {
                        const evConf = ALL_EVENTS.find(e => e.value === ev)
                        return (
                          <span key={ev} className="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            {evConf?.label || ev}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleWebhook(webhook)}
                      className={cn('w-9 h-5 rounded-full transition-all relative', webhook.isActive ? 'bg-emerald-500' : 'bg-white/10')}
                    >
                      <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all', webhook.isActive ? 'left-[18px]' : 'left-0.5')} />
                    </button>
                    <button
                      onClick={() => setExpandedLogs(expandedLogs === webhook.id ? null : webhook.id)}
                      className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-600 hover:text-white transition-all"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteWebhook(webhook.id)}
                      className="w-7 h-7 rounded-lg hover:bg-red-400/10 flex items-center justify-center text-gray-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Logs */}
              {expandedLogs === webhook.id && webhook.logs && (
                <div className="border-t border-white/5 p-4">
                  <p className="text-xs text-gray-600 mb-2 font-medium">Últimas entregas</p>
                  {webhook.logs.length === 0 ? (
                    <p className="text-xs text-gray-700">Sem logs ainda</p>
                  ) : (
                    <div className="space-y-1.5">
                      {webhook.logs.slice(0, 5).map(log => (
                        <div key={log.id} className="flex items-center gap-2.5 text-xs">
                          {log.success
                            ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          }
                          <span className="text-gray-400">{log.event}</span>
                          {log.statusCode && (
                            <span className={cn('px-1.5 py-0.5 rounded text-[10px]',
                              log.statusCode < 300 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                            )}>
                              {log.statusCode}
                            </span>
                          )}
                          <span className="text-gray-700 ml-auto">
                            {format(new Date(log.createdAt), 'dd/MM HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <WebhookModal
          onClose={() => setShowModal(false)}
          onSave={(wh) => { setWebhooks(prev => [wh, ...prev]); setShowModal(false) }}
        />
      )}
    </div>
  )
}

function WebhookModal({ onClose, onSave }: { onClose: () => void; onSave: (w: WebhookWithLogs) => void }) {
  const [form, setForm] = useState({ name: '', url: '', secret: '', events: [] as string[] })
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)

  const toggleEvent = (ev: string) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.events.length === 0) { toast.error('Selecione ao menos um evento'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Webhook criado!')
        onSave(data.data)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d0f18] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white">Novo Webhook</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Nome *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/40 transition-all" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">URL *</label>
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required type="url"
              placeholder="https://seuservico.com/webhook"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/40 transition-all" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Secret (opcional)</label>
            <div className="relative">
              <input value={form.secret} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
                type={showSecret ? 'text' : 'password'} placeholder="Para verificação HMAC"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 pr-10 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/40 transition-all" />
              <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Eventos *</label>
            <div className="space-y-2">
              {ALL_EVENTS.map(ev => (
                <label key={ev.value} className="flex items-center gap-2.5 cursor-pointer group">
                  <div
                    onClick={() => toggleEvent(ev.value)}
                    className={cn('w-4 h-4 rounded border transition-all flex items-center justify-center',
                      form.events.includes(ev.value)
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-white/20 hover:border-white/40'
                    )}
                  >
                    {form.events.includes(ev.value) && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{ev.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-400 text-sm hover:bg-white/8 transition-all">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Criar Webhook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
