'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Users, Clock, TrendingUp, Circle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useSocket } from '@/components/layout/SocketProvider'

interface DashStats {
  openConversations: number
  myConversations: number
  waitingConversations: number
  onlineAgents: number
  agentStatuses: Array<{ id: string; name: string; status: string; conversations: number }>
  recentActivity: Array<{ id: string; contact: string; message: string; time: string; status: string }>
}

const STATUS_DOT: Record<string, string> = {
  ONLINE: 'fill-emerald-400 text-emerald-400',
  BUSY: 'fill-amber-400 text-amber-400',
  OFFLINE: 'fill-gray-600 text-gray-600',
}

export default function DashboardHome() {
  const { socket, isConnected } = useSocket()
  const [stats, setStats] = useState<DashStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/reports?days=1')
      const data = await res.json()
      if (data.success) {
        setStats({
          openConversations: data.data.statusDistribution.find((s: { status: string }) => s.status === 'OPEN')?.count || 0,
          myConversations: data.data.statusDistribution.find((s: { status: string }) => s.status === 'IN_PROGRESS')?.count || 0,
          waitingConversations: data.data.statusDistribution.find((s: { status: string }) => s.status === 'WAITING')?.count || 0,
          onlineAgents: data.data.agentRanking.length,
          agentStatuses: data.data.agentRanking.slice(0, 5),
          recentActivity: [],
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('conversation_update', fetchStats)
    socket.on('new_message', fetchStats)
    return () => {
      socket.off('conversation_update', fetchStats)
      socket.off('new_message', fetchStats)
    }
  }, [socket])

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Visão Geral</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={cn('w-2 h-2 rounded-full', isConnected ? 'bg-emerald-400' : 'bg-red-400')} />
            <span className={cn('text-xs', isConnected ? 'text-emerald-400' : 'text-red-400')}>
              {isConnected ? 'Conectado em tempo real' : 'Sem conexão em tempo real'}
            </span>
          </div>
        </div>
        <Link href="/conversations"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20">
          Ir para conversas
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: MessageSquare, label: 'Conversas Abertas', value: stats?.openConversations ?? '—', color: 'blue', href: '/conversations?status=OPEN' },
          { icon: Clock, label: 'Em Atendimento', value: stats?.myConversations ?? '—', color: 'amber', href: '/conversations?status=IN_PROGRESS' },
          { icon: TrendingUp, label: 'Aguardando', value: stats?.waitingConversations ?? '—', color: 'purple', href: '/conversations?status=WAITING' },
          { icon: Users, label: 'Agentes Online', value: stats?.onlineAgents ?? '—', color: 'emerald', href: '/users' },
        ].map(stat => {
          const Icon = stat.icon
          const colors = {
            blue: { bg: 'bg-blue-500/10', icon: 'text-blue-400', border: 'border-blue-500/10', val: 'text-blue-300' },
            amber: { bg: 'bg-amber-500/10', icon: 'text-amber-400', border: 'border-amber-500/10', val: 'text-amber-300' },
            purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', border: 'border-purple-500/10', val: 'text-purple-300' },
            emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', border: 'border-emerald-500/10', val: 'text-emerald-300' },
          }
          const c = colors[stat.color as keyof typeof colors]

          return (
            <Link key={stat.label} href={stat.href}
              className={cn('bg-[#0d0f18] rounded-2xl border p-4 hover:bg-[#111420] transition-all group', c.border)}>
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', c.bg)}>
                <Icon className={cn('w-5 h-5', c.icon)} />
              </div>
              {loading ? (
                <div className="h-8 w-12 bg-white/5 rounded animate-pulse mb-1" />
              ) : (
                <p className={cn('text-3xl font-bold', c.val)}>{stat.value}</p>
              )}
              <p className="text-xs text-gray-500 mt-1 group-hover:text-gray-400 transition-colors">{stat.label}</p>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent status overview */}
        <div className="bg-[#0d0f18] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Status dos Atendentes</h3>
            <Link href="/users" className="text-xs text-gray-600 hover:text-emerald-400 transition-colors">
              Ver todos →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-white/3 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : stats?.agentStatuses.length === 0 ? (
            <p className="text-xs text-gray-700 text-center py-6">Sem dados de agentes</p>
          ) : (
            <div className="space-y-2">
              {stats?.agentStatuses.map(agent => (
                <div key={agent.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/3 transition-all">
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-300">
                    {agent.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{agent.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Circle className={cn('w-2 h-2', STATUS_DOT[agent.status] || STATUS_DOT.OFFLINE)} />
                      <span className="text-xs text-gray-600">
                        {agent.status === 'ONLINE' ? 'Online' : agent.status === 'BUSY' ? 'Ocupado' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-400">{agent.conversations}</p>
                    <p className="text-[10px] text-gray-700">atend.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-[#0d0f18] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/conversations', label: 'Ver conversas', icon: MessageSquare, color: 'emerald' },
              { href: '/contacts', label: 'Contatos', icon: Users, color: 'blue' },
              { href: '/bulk-send', label: 'Disparo em massa', icon: TrendingUp, color: 'purple' },
              { href: '/reports', label: 'Relatórios', icon: Clock, color: 'amber' },
            ].map(action => {
              const Icon = action.icon
              const colors: Record<string, string> = {
                emerald: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 border-emerald-500/15',
                blue: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/15 border-blue-500/15',
                purple: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/15 border-purple-500/15',
                amber: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/15 border-amber-500/15',
              }
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all text-center',
                    colors[action.color]
                  )}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
