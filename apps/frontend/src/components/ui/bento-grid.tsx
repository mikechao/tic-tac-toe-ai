import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export function BentoGrid({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'grid gap-4 md:auto-rows-[minmax(160px,1fr)] md:grid-cols-12',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface BentoCardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Tailwind column span classes for responsive layouts.
   * @default "md:col-span-4"
   */
  colSpanClassName?: string
}

export function BentoCard({
  colSpanClassName = 'md:col-span-4',
  className,
  children,
  ...props
}: BentoCardProps) {
  return (
    <div
      className={cn(
        'col-span-12',
        colSpanClassName,
        'rounded-[1.75rem] border border-white/10 bg-[var(--surface)]/80 p-6 backdrop-blur',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
