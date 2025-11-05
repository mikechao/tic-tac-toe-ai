import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function Dock({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'fixed inset-x-4 bottom-4 z-50 flex items-center gap-3 rounded-[2rem] border border-white/10 bg-[var(--muted-surface)]/90 p-3 shadow-[0_20px_60px_rgba(5,7,16,0.8)] backdrop-blur-lg md:hidden',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface DockItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  active?: boolean
}

export function DockItem({
  icon,
  label,
  active = false,
  className,
  ...props
}: DockItemProps) {
  return (
    <button
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-white/10 text-white shadow-[inset_0_0_20px_rgba(79,242,194,0.3)]'
          : 'text-white/70 hover:bg-white/5',
        className,
      )}
      {...props}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
