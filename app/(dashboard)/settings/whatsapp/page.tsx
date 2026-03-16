'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wifi, WifiOff, RefreshCw, LogOut, QrCode, CheckCircle, Loader2, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Status = 'disconnected' | 'connecting' | 'qr_ready' | 'connected'

export default function WhatsAppConnectionPage() {
  const [status, setStatus] = useState<Status>('disconnected')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [qrExpiry, setQrExpiry] = useState(0)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/status')
      const data = await res.json()
      if (!data.success) return
      setStatus(data.data.status as Status)
      if (data.data.qrCode) setQrCode(data.data.qrCode)
    } catch {}
  }, [])

  useEffect(() => {
    fetchStatus()
    const t = setInterval(fetchStatus, 2000)
    return () => clearInterval(t)
  }, [fetchStatus])

  useEffect(() => {
    const onQR = (e: Event) => { setQrCode((e as CustomEvent).detail.qr); setStatus('qr_ready') }
    const onConn = (e: Event) => { const d = (e as CustomEvent).detail; setStatus('connected'); setQrCode(null); if (d.phone) setPhone(d.phone) }
    const onDisc = () => { setStatus('disconnected'); setQrCode(null) }
    window.addEventListener('wa:qr', onQR)
    window.addEventListener('wa:connected', onConn)
    window.addEventListener('wa:disconnected', onDisc)
    return () => {
      window.removeEventListener('wa:qr', onQR)
      window.removeEventListener('wa:connected', onConn)
      window.removeEventListener('wa:disconnected', onDisc)
    }
  }, [])

  useEffect(() => {
    if (status !== 'qr_ready') { setQrExpiry(0); return }
    setQrExpiry(60)
    const t = setInterval(() => setQrExpiry(p => { if (p <= 1) { clearInterval(t); return 0 } return p - 1 }), 1000)
    return () => clearInterval(t)
  }, [status, qrCode])

  const doAction = async (action: string) => {
    setLoading(true)
    try {
      await fetch('/api/whatsapp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (action === 'connect') { setStatus('connecting'); toast('Aguarde o QR Code...', { icon: '📱' }) }
      if (action === 'disconnect') { setStatus('disconnected'); setQrCode(null); setPhone(null); toast.success('Desconectado') }
      if (action === 'clear') { setStatus('connecting'); setQrCode(null); toast('Novo QR em breve...', { icon: '🔄' }) }
    } finally { setLoading(false) }
  }

  const configs = {
    disconnected: { label: 'Desconectado',  color: 'text-gray-400',    bg: 'bg-gray-500/10',    border: 'border-white/8',        icon: WifiOff     },
    connecting:   { label: 'Conectando...', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: Loader2     },
    qr_ready:     { label: 'Escaneie o QR', color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    icon: QrCode      },
    connected:    { label: 'Conectado',     color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle },
  }
  const cfg = configs[status]
  const Icon = cfg.icon

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Conexao WhatsApp</h1>
        <p className="text-sm text-gray-500 mt-0.5">Conecte via QR Code, custo zero</p>
      </div>

      <div className={cn('rounded-2xl border p-5 flex items-center gap-4', cfg.bg, cfg.border)}>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', cfg.bg)}>
          <Icon className={cn('w-6 h-6', cfg.color, status === 'connecting' && 'animate-spin')} />
        </div>
        <div className="flex-1">
          <p className={cn('font-semibold', cfg.color)}>{cfg.label}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {status === 'disconnected' && 'Clique em Conectar para gerar o QR Code'}
            {status === 'connecting' && 'Iniciando conexao com o WhatsApp...'}
            {status === 'qr_ready' && 'Escaneie com o WhatsApp no celular'}
            {status === 'connected' && 'Recebendo e enviando mensagens'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {status === 'disconnected' && (
            <button onClick={() => doAction('connect')} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 border border-emerald-500/20 disabled:opacity-50 transition-all">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              Conectar
            </button>
          )}
          {status === 'connected' && (
            <button onClick={() => doAction('disconnect')} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/15 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/25 border border-red-500/20 disabled:opacity-50 transition-all">
              <LogOut className="w-4 h-4" />
              Desconectar
            </button>
          )}
          {(status === 'qr_ready' || status === 'connecting') && (
            <button onClick={() => doAction('clear')} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 text-gray-400 rounded-xl text-sm hover:bg-white/8 transition-all">
              <RefreshCw className="w-4 h-4" />
              Novo QR
            </button>
          )}
        </div>
      </div>

      {status === 'qr_ready' && qrCode && (
        <div className="bg-[#0d0f18] border border-blue-500/20 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-blue-400" />
            Escaneie com seu celular
          </h3>
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="bg-white p-4 rounded-2xl shadow-2xl shrink-0">
              {qrCode.startsWith('data:image') ? (
                <img src={qrCode} alt="QR Code WhatsApp" className="w-56 h-56" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center bg-white">
                  <p className="text-xs font-mono break-all text-black p-2">{qrCode}</p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {[
                'Abra o WhatsApp no celular',
                'Toque nos 3 pontos no canto superior',
                'Toque em Aparelhos conectados',
                'Toque em Conectar um aparelho',
                'Aponte a camera para o QR Code',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-400">{step}</span>
                </div>
              ))}
              {qrExpiry > 0 && qrExpiry <= 15 && (
                <p className="text-xs text-amber-400">QR expira em {qrExpiry}s</p>
              )}
            </div>
          </div>
        </div>
      )}

      {status === 'connected' && (
        <div className="bg-[#0d0f18] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            Sessao ativa
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="text-emerald-400 font-medium">Online</span>
            </div>
            {phone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Numero</span>
                <span className="text-gray-200">+{phone}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
