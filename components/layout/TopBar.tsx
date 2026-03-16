'use client'

import { useState } from 'react'
import { Search, ChevronDown, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuthSession } from '@/types'
import { NotificationBell } from './NotificationBell'
import { useSocket } from './SocketProvider'

const STATUS_OPTIONS = [
  { value: 'ONLINE',  label: 'Online',   dot: 'text-emerald-400 fill-emerald-400' },
  { value: 'BUSY',    label: 'Ocupado',  dot: 'text-amber-400   fill-amber-400'   },
  { value: 'OFFLINE', label: 'Offline',  dot: 'text-gray-500    fill-gray-500'    },
] as const

export function TopBar({ session }: { session: AuthSession }) {
  const { socket, isConnected } = useSocket()
  const [status, setStatus]       = useState<'ONLINE' | 'BUSY' | 'OFFLINE'>('ONLINE')
  const [dropdownOpen, setDropdown] = useState(false)

  const current = STATUS_OPTIONS.find(s => s.value === status)!

  const handleStatus = (v: typeof status) => {
    setStatus(v)
    setDropdown(false)
    socket?.emit('set_status', v)
  }

  const roleLabel =
    session.role === 'AGENT'   ? 'Atendente' :
    session.role === 'MANAGER' ? 'Gestor'    : 'Admin'

  return (
    <header className="h-14 border-b border-white/5 bg-[#0a0c10] flex items-center px-4 gap-3 shrink-0">

      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar conversas, contatos..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">

        {/* Live indicator */}
        <div className={cn(
          'hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium',
          isConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'
        )}>
          <div className={cn('w-1.5 h-1.5 rounded-full', isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400')} />
          {isConnected ? 'Ao vivo' : 'Offline'}
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* Status selector */}
        <div className="relative">
          <button
            onClick={() => setDropdown(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/8"
          >
            <Circle className={cn('w-2.5 h-2.5', current.dot)} />
            <span className={cn('text-xs font-medium hidden sm:block', current.dot.split(' ')[0])}>
              {current.label}
            </span>
            <ChevronDown className="w-3 h-3 text-gray-600" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdown(false)} />
              <div className="absolute right-0 top-full mt-2 w-36 bg-[#1a1d27] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatus(opt.value)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-white/5 transition-colors',
                      status === opt.value && 'bg-white/3'
                    )}
                  >
                    <Circle className={cn('w-2.5 h-2.5', opt.dot)} />
                    <span className={opt.dot.split(' ')[0]}>{opt.label}</span>
                    {status === opt.value && <span className="text-[10px] text-gray-600 ml-auto">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/8" />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-purple-500/20">
            {session.name.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-white leading-tight">{session.name}</p>
            <p className="text-[10px] text-gray-500 leading-tight">{roleLabel}</p>
          </div>
        </div>

      </div>
    </header>
  )
}
