'use client'

import { useState, useEffect } from 'react'
import { Save, Phone, Shield, Bell, Palette, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface WAConfig {
  phoneNumberId: string
  displayName: string
  accessToken: string
  webhookSecret: string
  businessId: string
  isActive: boolean
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'security' | 'notifications'>('whatsapp')
  const [waConfig, setWaConfig] = useState<WAConfig>({
    phoneNumberId: '', displayName: '', accessToken: '',
    webhookSecret: '', businessId: '', isActive: false
  })
  const [saving, setSaving] = useState(false)
  const [showToken, setShowToken] = useState(false)

  useEffect(() => {
    fetch('/api/settings/whatsapp').then(r => r.json()).then(data => {
      if (data.success && data.data) setWaConfig(data.data)
    })
  }, [])

  const saveWaConfig = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waConfig)
      })
      const data = await res.json()
      if (data.success) toast.success('Configuração salva!')
      else toast.error(data.error || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'whatsapp' as const, label: 'WhatsApp', icon: Phone },
    { id: 'security' as const, label: 'Segurança', icon: Shield },
    { id: 'notifications' as const, label: 'Notificações', icon: Bell },
  ]

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie as configurações do sistema</p>
      </div>

      <div className="flex gap-1 bg-white/3 p-1 rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.id ? 'bg-white/8 text-white' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'whatsapp' && (
        <div className="max-w-2xl space-y-5">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-300 mb-1">Conexao por QR Code (WhatsApp Web)</p>
            <p className="text-xs text-gray-400">
              Se voce quer usar o modo Baileys (QR Code), acesse a pagina de conexao:
              <a href="/settings/whatsapp" className="text-blue-300 hover:underline ml-1">/settings/whatsapp</a>
            </p>
          </div>
          {/* Setup guide */}
          <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4">
            <p className="text-sm font-medium text-emerald-400 mb-2">Como configurar a API do WhatsApp</p>
            <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Acesse <a href="https://developers.facebook.com" target="_blank" className="text-emerald-400 hover:underline">developers.facebook.com</a> e crie um App Business</li>
              <li>Adicione o produto "WhatsApp" ao seu app</li>
              <li>Gere um token de acesso permanente (System User)</li>
              <li>Configure o webhook com a URL: <code className="bg-white/5 px-1 rounded">/api/webhooks/whatsapp</code></li>
              <li>Insira as credenciais abaixo e salve</li>
            </ol>
          </div>

          <div className="bg-[#0d0f18] border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              Configuração da API
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">Status da conexão</p>
                <p className="text-xs text-gray-600 mt-0.5">{waConfig.isActive ? 'Conectado e ativo' : 'Desconectado'}</p>
              </div>
              <button
                onClick={() => setWaConfig(c => ({ ...c, isActive: !c.isActive }))}
                className={cn('w-11 h-6 rounded-full transition-all relative', waConfig.isActive ? 'bg-emerald-500' : 'bg-white/10')}
              >
                <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm', waConfig.isActive ? 'left-[26px]' : 'left-1')} />
              </button>
            </div>

            {[
              { field: 'phoneNumberId', label: 'Phone Number ID *', placeholder: '123456789012345', type: 'text' },
              { field: 'displayName', label: 'Nome de exibição', placeholder: 'Minha Empresa', type: 'text' },
              { field: 'businessId', label: 'Business Account ID', placeholder: '123456789', type: 'text' },
              { field: 'webhookSecret', label: 'Webhook Verify Token *', placeholder: 'meu-token-secreto', type: 'text' },
            ].map(({ field, label, placeholder, type }) => (
              <div key={field}>
                <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
                <input
                  type={type}
                  value={(waConfig as Record<string, string>)[field]}
                  onChange={e => setWaConfig(c => ({ ...c, [field]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-emerald-500/40 transition-all font-mono"
                />
              </div>
            ))}

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Access Token *</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={waConfig.accessToken}
                  onChange={e => setWaConfig(c => ({ ...c, accessToken: e.target.value }))}
                  placeholder="EAABsbCS..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 pr-10 text-sm text-gray-200 placeholder:text-gray-700 focus:outline-none focus:border-emerald-500/40 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showToken ? '🙈' : '👁'}
                </button>
              </div>
              <p className="text-[10px] text-gray-700 mt-1">Token permanente (System User). Nunca compartilhe este token.</p>
            </div>

            <div className="flex gap-2 justify-between items-center pt-2">
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Documentação oficial
              </a>
              <button
                onClick={saveWaConfig}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar configuração'}
              </button>
            </div>
          </div>

          {/* Webhook info */}
          <div className="bg-[#0d0f18] border border-white/5 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">📡 Configuração do Webhook no Meta</h3>
            <div className="space-y-3">
              {[
                { label: 'URL do Webhook', value: `${typeof window !== 'undefined' ? window.location.origin : 'https://seudominio.com'}/api/webhooks/whatsapp` },
                { label: 'Verify Token', value: waConfig.webhookSecret || '(configure acima)' },
                { label: 'Campos obrigatórios', value: 'messages' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="text-xs text-gray-600 w-36 shrink-0 pt-0.5">{item.label}</span>
                  <code className="text-xs text-emerald-300 bg-white/5 px-2 py-1 rounded-lg break-all flex-1">
                    {item.value}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="max-w-2xl">
          <div className="bg-[#0d0f18] border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              Segurança
            </h3>
            <p className="text-sm text-gray-500">Configurações de segurança e autenticação.</p>
            <div className="space-y-3">
              {[
                { label: 'Sessões com expiração de 7 dias', active: true },
                { label: 'Cookies httpOnly', active: true },
                { label: 'Verificação de assinatura de webhooks', active: true },
                { label: '2FA (em breve)', active: false },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-white/3 last:border-0">
                  <span className="text-sm text-gray-300">{item.label}</span>
                  <span className={cn('text-xs px-2 py-1 rounded-lg font-medium',
                    item.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-500/15 text-gray-500'
                  )}>
                    {item.active ? 'Ativo' : 'Em breve'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="max-w-2xl">
          <div className="bg-[#0d0f18] border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Notificações
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Nova mensagem recebida', desc: 'Notificar quando um cliente enviar mensagem' },
                { label: 'Conversa atribuída a mim', desc: 'Notificar quando uma conversa for atribuída' },
                { label: 'Menção em nota interna', desc: 'Notificar quando for mencionado em uma nota' },
              ].map((item, i) => (
                <div key={i} className="flex items-start justify-between py-2.5 border-b border-white/3 last:border-0 gap-4">
                  <div>
                    <p className="text-sm text-gray-200">{item.label}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
                  </div>
                  <button className="w-10 h-5 rounded-full bg-emerald-500 relative shrink-0 mt-1">
                    <div className="absolute top-0.5 left-[22px] w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
