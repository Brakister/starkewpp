'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload, Play, Pause, Trash2, Plus, Users, CheckCircle,
  XCircle, Clock, Megaphone, FileText
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { BulkCampaign } from '@/types'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Rascunho', color: 'text-gray-400', icon: FileText },
  SCHEDULED: { label: 'Agendado', color: 'text-blue-400', icon: Clock },
  RUNNING: { label: 'Em andamento', color: 'text-amber-400', icon: Play },
  PAUSED: { label: 'Pausado', color: 'text-purple-400', icon: Pause },
  COMPLETED: { label: 'Concluído', color: 'text-emerald-400', icon: CheckCircle },
  FAILED: { label: 'Falhou', color: 'text-red-400', icon: XCircle },
}

export default function BulkSendPage() {
  const [campaigns, setCampaigns] = useState<BulkCampaign[]>([])
  const [showNew, setShowNew] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [message, setMessage] = useState('')
  const [csvContacts, setCsvContacts] = useState<Array<{ phone: string; name?: string }>>([])
  const [creating, setCreating] = useState(false)

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return

    const text = await file.text()
    const res = await fetch('/api/bulk-send/parse-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: text })
    })
    const data = await res.json()
    if (data.success) {
      setCsvContacts(data.data)
      toast.success(`${data.data.length} contatos importados!`)
    } else {
      toast.error('Erro ao importar CSV')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'text/plain': ['.txt'] },
    multiple: false
  })

  const createCampaign = async () => {
    if (!campaignName || !message || csvContacts.length === 0) {
      toast.error('Preencha todos os campos e importe os contatos')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: campaignName, message, contacts: csvContacts })
      })
      const data = await res.json()
      if (data.success) {
        setCampaigns(prev => [data.data, ...prev])
        setShowNew(false)
        setCampaignName('')
        setMessage('')
        setCsvContacts([])
        toast.success('Campanha criada!')
      }
    } finally {
      setCreating(false)
    }
  }

  const runCampaign = async (id: string) => {
    const res = await fetch(`/api/bulk-send/${id}/run`, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'RUNNING' } : c))
      toast.success('Campanha iniciada!')
    }
  }

  const pauseCampaign = async (id: string) => {
    await fetch(`/api/bulk-send/${id}/pause`, { method: 'POST' })
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'PAUSED' } : c))
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Disparo em Massa</h1>
          <p className="text-sm text-gray-500 mt-0.5">Envie mensagens para múltiplos contatos</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
      </div>

      {/* Rate limit warning */}
      <div className="flex items-start gap-3 p-3.5 bg-amber-500/8 border border-amber-500/20 rounded-xl">
        <div className="text-amber-400 mt-0.5">⚠️</div>
        <div>
          <p className="text-xs font-medium text-amber-400">Atenção aos limites do WhatsApp</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Para evitar bloqueio, o sistema envia em lotes com intervalo automático de segurança.
            Use apenas a API Oficial do WhatsApp e templates aprovados quando necessário.
          </p>
        </div>
      </div>

      {/* New Campaign Form */}
      {showNew && (
        <div className="bg-[#0d0f18] border border-white/8 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Nova Campanha</h3>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Nome da Campanha</label>
            <input
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              placeholder="Ex: Promoção de Julho"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40 transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Mensagem
              <span className="ml-2 text-gray-700">Use {'{{name}}'} para personalizar</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Olá {{name}}! Temos uma novidade para você..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40 transition-all resize-none"
            />
            <p className="text-[10px] text-gray-700 mt-1">{message.length} caracteres</p>
          </div>

          {/* CSV Upload */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Lista de Contatos (CSV)</label>
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                isDragActive
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/3'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              {csvContacts.length > 0 ? (
                <div>
                  <p className="text-sm font-medium text-emerald-400">
                    {csvContacts.length} contatos importados
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">Arraste um novo arquivo para substituir</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-400">Arraste um arquivo CSV ou clique para selecionar</p>
                  <p className="text-xs text-gray-600 mt-1">Colunas: phone, name (opcional)</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowNew(false)}
              className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={createCampaign}
              disabled={creating}
              className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20 disabled:opacity-50"
            >
              {creating ? 'Criando...' : 'Criar Campanha'}
            </button>
          </div>
        </div>
      )}

      {/* Campaign List */}
      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Megaphone className="w-12 h-12 text-gray-700 mb-3" />
            <p className="text-sm text-gray-500">Nenhuma campanha criada ainda</p>
          </div>
        ) : (
          campaigns.map(campaign => {
            const st = STATUS_CONFIG[campaign.status]
            const Icon = st.icon
            const progress = campaign.totalCount > 0
              ? Math.round((campaign.sentCount / campaign.totalCount) * 100)
              : 0

            return (
              <div key={campaign.id} className="bg-[#0d0f18] border border-white/5 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">{campaign.name}</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {format(new Date(campaign.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn('w-3.5 h-3.5', st.color)} />
                    <span className={cn('text-xs font-medium', st.color)}>{st.label}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 mb-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-600" />
                    <span className="text-gray-400">{campaign.totalCount} contatos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-gray-400">{campaign.sentCount} enviados</span>
                  </div>
                  {campaign.failedCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-gray-400">{campaign.failedCount} falhas</span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {campaign.status !== 'DRAFT' && (
                  <div className="mb-3">
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500/60 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-700 mt-1">{progress}% concluído</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {campaign.status === 'DRAFT' && (
                    <button
                      onClick={() => runCampaign(campaign.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-all"
                    >
                      <Play className="w-3 h-3" />
                      Iniciar
                    </button>
                  )}
                  {campaign.status === 'RUNNING' && (
                    <button
                      onClick={() => pauseCampaign(campaign.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium hover:bg-amber-500/25 transition-all"
                    >
                      <Pause className="w-3 h-3" />
                      Pausar
                    </button>
                  )}
                  {campaign.status === 'PAUSED' && (
                    <button
                      onClick={() => runCampaign(campaign.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-all"
                    >
                      <Play className="w-3 h-3" />
                      Retomar
                    </button>
                  )}
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-gray-500 text-xs font-medium hover:text-red-400 hover:bg-red-400/10 transition-all ml-auto">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
