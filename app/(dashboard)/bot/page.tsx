'use client'

import { useState, useEffect } from 'react'
import { Zap, Plus, Trash2, Save, GripVertical, Power, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { BotConfig, BotFlow } from '@/types'

export default function BotPage() {
  const [config, setConfig] = useState<BotConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/bot').then(r => r.json()).then(data => {
      if (data.success && data.data) setConfig(data.data)
      else setConfig({
        id: '', name: 'Bot Principal', isActive: false,
        welcomeMsg: '', fallbackMsg: '', transferMsg: '',
        autoTransfer: true, transferDelay: 60,
        aiEnabled: false, aiPrompt: '', flows: []
      })
    }).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!config) return
    setSaving(true)
    try {
      const url = config.id ? `/api/bot/${config.id}` : '/api/bot'
      const res = await fetch(url, {
        method: config.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      const data = await res.json()
      if (data.success) {
        setConfig(data.data)
        toast.success('Configuração salva!')
      }
    } finally {
      setSaving(false)
    }
  }

  const addFlow = () => {
    setConfig(c => c ? {
      ...c,
      flows: [...(c.flows || []), {
        id: `new-${Date.now()}`,
        trigger: '',
        response: '',
        action: '',
        actionData: '',
        order: (c.flows?.length || 0) + 1
      }]
    } : c)
  }

  const updateFlow = (id: string, updates: Partial<BotFlow>) => {
    setConfig(c => c ? {
      ...c,
      flows: (c.flows || []).map(f => f.id === id ? { ...f, ...updates } : f)
    } : c)
  }

  const removeFlow = (id: string) => {
    setConfig(c => c ? { ...c, flows: (c.flows || []).filter(f => f.id !== id) } : c)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>
  }

  if (!config) return null

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Bot & Automação</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure respostas automáticas e fluxos</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle active */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfig(c => c ? { ...c, isActive: !c.isActive } : c)}
              className={cn('w-11 h-6 rounded-full transition-all relative', config.isActive ? 'bg-emerald-500' : 'bg-white/10')}
            >
              <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm', config.isActive ? 'left-[26px]' : 'left-1')} />
            </button>
            <span className={cn('text-sm font-medium', config.isActive ? 'text-emerald-400' : 'text-gray-500')}>
              {config.isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Messages */}
        <div className="space-y-4">
          <div className="bg-[#0d0f18] border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Mensagens do Bot
            </h3>

            {([
              { field: 'welcomeMsg', label: '👋 Boas-vindas', placeholder: 'Olá! Como posso ajudar?' },
              { field: 'fallbackMsg', label: '❓ Fallback (não entendeu)', placeholder: 'Não entendi. Um agente irá te ajudar.' },
              { field: 'transferMsg', label: '👤 Transferência', placeholder: 'Transferindo para um atendente...' },
            ] as const).map(({ field, label, placeholder }) => (
              <div key={field}>
                <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
                <textarea
                  value={(config as Record<string, unknown>)[field] as string || ''}
                  onChange={e => setConfig(c => c ? { ...c, [field]: e.target.value } : c)}
                  placeholder={placeholder}
                  rows={3}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-emerald-500/40 transition-all resize-none"
                />
              </div>
            ))}
          </div>

          {/* Auto transfer settings */}
          <div className="bg-[#0d0f18] border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">⚙️ Configurações de Transferência</h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">Transferência automática</p>
                <p className="text-xs text-gray-600 mt-0.5">Transferir para agente humano após inatividade</p>
              </div>
              <button
                onClick={() => setConfig(c => c ? { ...c, autoTransfer: !c.autoTransfer } : c)}
                className={cn('w-10 h-5 rounded-full transition-all relative', config.autoTransfer ? 'bg-emerald-500' : 'bg-white/10')}
              >
                <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all', config.autoTransfer ? 'left-[22px]' : 'left-0.5')} />
              </button>
            </div>

            {config.autoTransfer && (
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Delay para transferência (segundos)</label>
                <input
                  type="number"
                  value={config.transferDelay}
                  onChange={e => setConfig(c => c ? { ...c, transferDelay: parseInt(e.target.value) || 60 } : c)}
                  min={10}
                  max={600}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/40 transition-all"
                />
              </div>
            )}
          </div>

          {/* AI config */}
          <div className="bg-[#0d0f18] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">🤖 Respostas com IA</h3>
              <button
                onClick={() => setConfig(c => c ? { ...c, aiEnabled: !c.aiEnabled } : c)}
                className={cn('w-10 h-5 rounded-full transition-all relative', config.aiEnabled ? 'bg-emerald-500' : 'bg-white/10')}
              >
                <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all', config.aiEnabled ? 'left-[22px]' : 'left-0.5')} />
              </button>
            </div>

            {config.aiEnabled && (
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">System Prompt da IA</label>
                <textarea
                  value={config.aiPrompt || ''}
                  onChange={e => setConfig(c => c ? { ...c, aiPrompt: e.target.value } : c)}
                  placeholder="Você é um assistente da [Empresa]. Responda de forma educada e profissional..."
                  rows={5}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-emerald-500/40 transition-all resize-none"
                />
                <p className="text-[10px] text-gray-700 mt-1">Requer ANTHROPIC_API_KEY ou OPENAI_API_KEY configurado</p>
              </div>
            )}

            {!config.aiEnabled && (
              <p className="text-xs text-gray-600">Ative para usar IA (Claude ou GPT) para responder mensagens automaticamente</p>
            )}
          </div>
        </div>

        {/* Right: Flows */}
        <div>
          <div className="bg-[#0d0f18] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">🔄 Fluxos de Resposta</h3>
              <button
                onClick={addFlow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Cada fluxo verifica o gatilho (palavra-chave ou regex) e executa uma resposta/ação.
              Processados em ordem de cima para baixo.
            </p>

            <div className="space-y-3">
              {(config.flows || []).length === 0 ? (
                <p className="text-xs text-gray-700 text-center py-6">
                  Nenhum fluxo configurado. Clique em "Adicionar" para criar.
                </p>
              ) : (
                (config.flows || []).map((flow, i) => (
                  <FlowCard
                    key={flow.id}
                    flow={flow}
                    index={i}
                    onUpdate={(updates) => updateFlow(flow.id, updates)}
                    onRemove={() => removeFlow(flow.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FlowCard({ flow, index, onUpdate, onRemove }: {
  flow: BotFlow
  index: number
  onUpdate: (u: Partial<BotFlow>) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-white/3 transition-all"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="w-4 h-4 text-gray-700 shrink-0" />
        <span className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-[10px] text-gray-500 shrink-0">
          {index + 1}
        </span>
        <span className="flex-1 text-xs text-gray-300 truncate">
          {flow.trigger || <span className="text-gray-600 italic">Gatilho não definido</span>}
        </span>
        <div className="flex items-center gap-1.5">
          {flow.action && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">
              {flow.action.replace('_', ' ')}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="w-5 h-5 rounded hover:bg-red-400/10 flex items-center justify-center text-gray-700 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <ChevronDown className={cn('w-3.5 h-3.5 text-gray-600 transition-transform', expanded && 'rotate-180')} />
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-white/5 pt-3">
          <div>
            <label className="text-[10px] text-gray-600 mb-1 block">Gatilho (texto ou /regex/)</label>
            <input
              value={flow.trigger}
              onChange={e => onUpdate({ trigger: e.target.value })}
              placeholder="ex: oi, olá, /^(1|vendas)$/i"
              className="w-full bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40 transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-600 mb-1 block">Resposta</label>
            <textarea
              value={flow.response}
              onChange={e => onUpdate({ response: e.target.value })}
              placeholder="Mensagem de resposta..."
              rows={2}
              className="w-full bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40 transition-all resize-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-600 mb-1 block">Ação (opcional)</label>
            <select
              value={flow.action || ''}
              onChange={e => onUpdate({ action: e.target.value })}
              className="w-full bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40 transition-all"
            >
              <option value="" className="bg-[#1a1d27]">Sem ação</option>
              <option value="transfer_to_team" className="bg-[#1a1d27]">Transferir para time</option>
              <option value="transfer_to_agent" className="bg-[#1a1d27]">Transferir para agente</option>
              <option value="close" className="bg-[#1a1d27]">Fechar conversa</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
