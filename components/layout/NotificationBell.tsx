'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, MessageSquare, UserPlus, CheckCircle, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useSocket } from '@/components/layout/SocketProvider'

interface Notification {
  id: string
  type: 'new_message' | 'conversation_assigned' | 'mention'
  title: string
  message: string
  conversationId?: string
  read: boolean
  createdAt: Date
}

export function NotificationBell() {
  const { socket } = useSocket()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Listen for socket notifications
  useEffect(() => {
    if (!socket) return

    const handleNotification = (data: { title: string; message: string; conversationId?: string }) => {
      const notif: Notification = {
        id: `n-${Date.now()}`,
        type: 'new_message',
        title: data.title,
        message: data.message,
        conversationId: data.conversationId,
        read: false,
        createdAt: new Date()
      }
      setNotifications(prev => [notif, ...prev].slice(0, 20)) // keep last 20
    }

    const handleAssigned = (data: { conversationId: string; assignedTo: { name: string } }) => {
      const notif: Notification = {
        id: `n-${Date.now()}`,
        type: 'conversation_assigned',
        title: 'Conversa atribuída',
        message: `Você recebeu uma nova conversa`,
        conversationId: data.conversationId,
        read: false,
        createdAt: new Date()
      }
      setNotifications(prev => [notif, ...prev].slice(0, 20))
    }

    socket.on('notification', handleNotification)
    socket.on('conversation_assigned', handleAssigned)

    return () => {
      socket.off('notification', handleNotification)
      socket.off('conversation_assigned', handleAssigned)
    }
  }, [socket])

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const ICONS = {
    new_message: MessageSquare,
    conversation_assigned: UserPlus,
    mention: Bell,
  }

  const ICON_COLORS = {
    new_message: 'text-emerald-400 bg-emerald-400/10',
    conversation_assigned: 'text-blue-400 bg-blue-400/10',
    mention: 'text-amber-400 bg-amber-400/10',
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-xl hover:bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0d0f18] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white">
              Notificações
              {unreadCount > 0 && (
                <span className="ml-2 text-xs text-emerald-400">({unreadCount} novas)</span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="w-8 h-8 text-gray-700 mb-2" />
                <p className="text-xs text-gray-600">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map(notif => {
                const Icon = ICONS[notif.type]
                const iconColor = ICON_COLORS[notif.type]

                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 border-b border-white/3 hover:bg-white/3 transition-all group',
                      !notif.read && 'bg-emerald-500/3'
                    )}
                  >
                    {/* Icon */}
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5', iconColor)}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={cn('text-xs font-medium leading-tight', notif.read ? 'text-gray-400' : 'text-white')}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{notif.message}</p>
                      <p className="text-[10px] text-gray-700 mt-1">
                        {format(notif.createdAt, "HH:mm 'de' dd/MM", { locale: ptBR })}
                      </p>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeNotification(notif.id) }}
                      className="w-5 h-5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 flex items-center justify-center text-gray-600 hover:text-white transition-all shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-white/5">
              <button
                onClick={() => setNotifications([])}
                className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Limpar todas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
