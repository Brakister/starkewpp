'use client'

import { useEffect, useState } from 'react'
import {
  BarChart3, TrendingUp, Users, MessageSquare, Clock,
  CheckCircle, Award, Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReportData {
  overview: {
    totalConversations: number
    closedConversations: number
    totalMessages: number
    resolutionRate: number
  }
  agentRanking: Array<{
    userId: string
    name: string
    avatar?: string
    messagesSent: number
    closedConversations: number
    avgResponseTime: number
  }>
  teamStats: Array<{
    teamId: string
    teamName: string
    color: string
    conversations: number
  }>
  conversationsByDay: Array<{ date: string; count: number }>
  statusDistribution: Array<{ status: string; count: number }>
}

const DAYS_OPTIONS = [7, 14, 30, 90]

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/reports?days=${days}`)
        const json = await res.json()
        if (json.success) setData(json.data)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [days])

  const maxDayCount = data
    ? Math.max(...data.conversationsByDay.map(d => d.count), 1)
    : 1

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Relatórios & Métricas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral do desempenho da equipe</p>
        </div>
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {DAYS_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                days === d ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/3 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={MessageSquare}
              label="Total de Atendimentos"
              value={data.overview.totalConversations}
              color="emerald"
            />
            <MetricCard
              icon={CheckCircle}
              label="Finalizados"
              value={data.overview.closedConversations}
              color="blue"
            />
            <MetricCard
              icon={TrendingUp}
              label="Taxa de Resolução"
              value={`${data.overview.resolutionRate}%`}
              color="purple"
            />
            <MetricCard
              icon={MessageSquare}
              label="Msgs Enviadas"
              value={data.overview.totalMessages}
              color="amber"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversations by day chart */}
            <div className="lg:col-span-2 bg-[#0d0f18] rounded-2xl border border-white/5 p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Atendimentos por dia
              </h3>
              <div className="flex items-end gap-1 h-32">
                {data.conversationsByDay.slice(-30).map((day) => (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center gap-1 group"
                  >
                    <div
                      className="w-full bg-emerald-500/30 hover:bg-emerald-500/60 rounded-sm transition-all relative"
                      style={{ height: `${(day.count / maxDayCount) * 100}%`, minHeight: day.count > 0 ? '2px' : '0' }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#1a1d27] text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-all pointer-events-none z-10">
                        {day.count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-gray-700">
                  {data.conversationsByDay[0]?.date}
                </span>
                <span className="text-[10px] text-gray-700">Hoje</span>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-[#0d0f18] rounded-2xl border border-white/5 p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                Por Status
              </h3>
              <div className="space-y-3">
                {data.statusDistribution.map(s => {
                  const total = data.statusDistribution.reduce((acc, x) => acc + x.count, 0)
                  const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
                  const colors: Record<string, string> = {
                    OPEN: '#60a5fa',
                    IN_PROGRESS: '#fbbf24',
                    WAITING: '#a78bfa',
                    CLOSED: '#6b7280'
                  }
                  const labels: Record<string, string> = {
                    OPEN: 'Aberta',
                    IN_PROGRESS: 'Em Atendimento',
                    WAITING: 'Aguardando',
                    CLOSED: 'Finalizada'
                  }
                  return (
                    <div key={s.status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">{labels[s.status] || s.status}</span>
                        <span className="text-xs font-medium text-gray-300">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: colors[s.status] || '#6b7280' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Agent Ranking */}
            <div className="bg-[#0d0f18] rounded-2xl border border-white/5 p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Ranking de Atendentes
              </h3>
              <div className="space-y-2">
                {data.agentRanking.slice(0, 8).map((agent, i) => (
                  <div key={agent.userId} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/3 transition-all">
                    <span className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                      i === 0 ? 'bg-amber-400/20 text-amber-400' :
                      i === 1 ? 'bg-gray-400/20 text-gray-300' :
                      i === 2 ? 'bg-orange-600/20 text-orange-400' :
                      'bg-white/5 text-gray-600'
                    )}>
                      {i + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-700/30 flex items-center justify-center text-xs font-bold text-violet-300 border border-white/10">
                      {agent.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-200 truncate">{agent.name}</p>
                      <p className="text-[10px] text-gray-600">{agent.messagesSent} mensagens</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-emerald-400">{agent.closedConversations}</p>
                      <p className="text-[10px] text-gray-600">finalizados</p>
                    </div>
                  </div>
                ))}
                {data.agentRanking.length === 0 && (
                  <p className="text-xs text-gray-700 text-center py-4">Sem dados no período</p>
                )}
              </div>
            </div>

            {/* Team Stats */}
            <div className="bg-[#0d0f18] rounded-2xl border border-white/5 p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Atendimentos por Time
              </h3>
              <div className="space-y-3">
                {data.teamStats.length > 0 ? (
                  data.teamStats.map(team => {
                    const maxTeam = Math.max(...data.teamStats.map(t => t.conversations), 1)
                    return (
                      <div key={team.teamId}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: team.color }} />
                            <span className="text-xs text-gray-300">{team.teamName}</span>
                          </div>
                          <span className="text-xs font-medium text-gray-400">{team.conversations}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(team.conversations / maxTeam) * 100}%`,
                              background: team.color
                            }}
                          />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-xs text-gray-700 text-center py-4">Sem times configurados</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function MetricCard({
  icon: Icon, label, value, color
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: 'emerald' | 'blue' | 'purple' | 'amber'
}) {
  const colors = {
    emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', border: 'border-emerald-500/10' },
    blue: { bg: 'bg-blue-500/10', icon: 'text-blue-400', border: 'border-blue-500/10' },
    purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', border: 'border-purple-500/10' },
    amber: { bg: 'bg-amber-500/10', icon: 'text-amber-400', border: 'border-amber-500/10' },
  }

  return (
    <div className={cn('rounded-2xl border p-4 bg-[#0d0f18]', colors[color].border)}>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', colors[color].bg)}>
        <Icon className={cn('w-5 h-5', colors[color].icon)} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}
