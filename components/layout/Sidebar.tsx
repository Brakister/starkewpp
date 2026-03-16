'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  MessageSquare, Users, BarChart3, Settings, Megaphone,
  Zap, Webhook, Building2, UserCircle, LogOut, Tag,
  Home, ChevronLeft, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store'
import type { UserRole } from '@/types'

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
  roles?: UserRole[]
  section?: string
}

const navItems: NavItem[] = [
  { href: '/', icon: Home, label: 'Início', section: 'main' },
  { href: '/conversations', icon: MessageSquare, label: 'Conversas', section: 'main' },
  { href: '/contacts', icon: UserCircle, label: 'Contatos', section: 'main' },
  { href: '/teams', icon: Building2, label: 'Times', roles: ['MANAGER', 'ADMIN'], section: 'manage' },
  { href: '/users', icon: Users, label: 'Usuários', roles: ['ADMIN'], section: 'manage' },
  { href: '/tags', icon: Tag, label: 'Etiquetas', roles: ['MANAGER', 'ADMIN'], section: 'manage' },
  { href: '/quick-replies', icon: Zap, label: 'Respostas Rápidas', section: 'manage' },
  { href: '/bulk-send', icon: Megaphone, label: 'Disparo em Massa', roles: ['MANAGER', 'ADMIN'], section: 'tools' },
  { href: '/reports', icon: BarChart3, label: 'Relatórios', roles: ['MANAGER', 'ADMIN'], section: 'tools' },
  { href: '/bot', icon: Zap, label: 'Bot & IA', roles: ['ADMIN'], section: 'tools' },
  { href: '/webhooks', icon: Webhook, label: 'Webhooks', roles: ['ADMIN'], section: 'tools' },
  { href: '/settings', icon: Settings, label: 'Configurações', roles: ['ADMIN'], section: 'tools' },
]

const SECTION_LABELS: Record<string, string> = {
  main: 'Principal',
  manage: 'Gerenciar',
  tools: 'Ferramentas',
}

export function Sidebar({ userRole }: { userRole: UserRole }) {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  const visibleItems = navItems.filter(item =>
    !item.roles || item.roles.includes(userRole)
  )

  const sections = ['main', 'manage', 'tools']

  return (
    <aside className={cn(
      'flex flex-col h-full bg-[#0a0c10] border-r border-white/5 shrink-0 transition-all duration-200',
      sidebarCollapsed ? 'w-14' : 'w-60'
    )}>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        {!sidebarCollapsed && (
          <span className="font-bold text-lg tracking-tight text-white whitespace-nowrap">
            Zap<span className="text-emerald-400">Flow</span>
          </span>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
        {sections.map(section => {
          const sectionItems = visibleItems.filter(i => i.section === section)
          if (sectionItems.length === 0) return null
          return (
            <div key={section}>
              {!sidebarCollapsed && (
                <p className="text-[10px] text-gray-700 uppercase tracking-widest font-semibold px-3 mb-1">
                  {SECTION_LABELS[section]}
                </p>
              )}
              <div className="space-y-0.5">
                {sectionItems.map(item => {
                  const isActive = item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href) && item.href !== '/'
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group',
                        isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <Icon className={cn('w-5 h-5 shrink-0 transition-colors', isActive ? 'text-emerald-400' : 'text-gray-500 group-hover:text-white')} />
                      {!sidebarCollapsed && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="px-2 pb-4 pt-3 border-t border-white/5 space-y-1">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-all"
        >
          {sidebarCollapsed
            ? <ChevronRight className="w-5 h-5 shrink-0" />
            : <><ChevronLeft className="w-5 h-5 shrink-0" /><span className="text-sm">Recolher</span></>
          }
        </button>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
            <LogOut className="w-5 h-5 shrink-0" />
            {!sidebarCollapsed && <span className="text-sm font-medium">Sair</span>}
          </button>
        </form>
      </div>
    </aside>
  )
}
