/**
 * ZapFlow - Shared UI Components
 */

import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

// ─── BADGE ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode
  color?: string
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, color, size = 'md', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-lg',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
        !color && 'bg-white/10 text-gray-400',
        className
      )}
      style={color ? { background: `${color}20`, color } : undefined}
    >
      {children}
    </span>
  )
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────

interface AvatarProps {
  name: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  status?: 'ONLINE' | 'BUSY' | 'OFFLINE'
  className?: string
}

const SIZE_CLASSES = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' }
const STATUS_COLORS = { ONLINE: 'bg-emerald-400', BUSY: 'bg-amber-400', OFFLINE: 'bg-gray-600' }
const STATUS_SIZES = { xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3.5 h-3.5' }

export function Avatar({ name, src, size = 'md', status, className }: AvatarProps) {
  return (
    <div className={cn('relative shrink-0', className)}>
      <div className={cn(
        'rounded-full flex items-center justify-center font-bold text-white border border-white/10',
        'bg-gradient-to-br from-violet-500/40 to-purple-700/40',
        SIZE_CLASSES[size]
      )}>
        {src ? (
          <img src={src} alt={name} className="w-full h-full rounded-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>
      {status && (
        <span className={cn(
          'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-[#0d0f18]',
          STATUS_SIZES[size],
          STATUS_COLORS[status]
        )} />
      )}
    </div>
  )
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  footer?: React.ReactNode
}

const MODAL_SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }

export function Modal({ title, onClose, children, size = 'md', footer }: ModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={cn(
        'bg-[#0d0f18] border border-white/10 rounded-2xl w-full shadow-2xl flex flex-col max-h-[90vh]',
        MODAL_SIZES[size]
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <h3 className="font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-white/5 shrink-0 flex gap-2 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── BUTTON ───────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  loading?: boolean
  icon?: React.ElementType
}

const BUTTON_VARIANTS = {
  primary: 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20',
  secondary: 'bg-white/5 text-gray-300 hover:bg-white/8 border border-white/10',
  danger: 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20',
  ghost: 'text-gray-400 hover:text-white hover:bg-white/5',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon: Icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'flex items-center justify-center gap-2 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
        BUTTON_VARIANTS[variant],
        className
      )}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  )
}

// ─── INPUT ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ElementType
}

export function Input({ label, error, icon: Icon, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />}
        <input
          {...props}
          className={cn(
            'w-full bg-white/5 border border-white/10 rounded-xl py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40 transition-all',
            Icon ? 'pl-9 pr-3' : 'px-3',
            error && 'border-red-500/40',
            className
          )}
        />
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/5 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-700" />
      </div>
      <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
      {description && <p className="text-xs text-gray-700 max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-white/5', className)} />
}

// ─── DIVIDER ──────────────────────────────────────────────────────────────────

export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="h-px bg-white/5 my-4" />
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-white/5" />
      <span className="text-[10px] text-gray-700 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  )
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

const CONV_STATUS: Record<string, { label: string; class: string }> = {
  OPEN: { label: 'Aberta', class: 'bg-blue-500/15 text-blue-400' },
  IN_PROGRESS: { label: 'Em Atendimento', class: 'bg-amber-500/15 text-amber-400' },
  WAITING: { label: 'Aguardando', class: 'bg-purple-500/15 text-purple-400' },
  CLOSED: { label: 'Finalizada', class: 'bg-gray-500/15 text-gray-500' },
}

export function ConversationStatusBadge({ status }: { status: string }) {
  const cfg = CONV_STATUS[status] || { label: status, class: 'bg-white/10 text-gray-400' }
  return (
    <span className={cn('text-xs px-2 py-1 rounded-lg font-medium', cfg.class)}>
      {cfg.label}
    </span>
  )
}
