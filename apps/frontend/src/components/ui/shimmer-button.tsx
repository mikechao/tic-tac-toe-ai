import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type ShimmerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  shine?: boolean
}

export function ShimmerButton({
  className,
  shine = true,
  children,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-semibold uppercase tracking-[0.2em]',
        'text-[color:var(--background)] transition-transform focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'bg-gradient-to-r from-[#4ff2c2] via-[#f15bb5] to-[#ffb547] hover:scale-[1.01] active:scale-[0.99]',
        shine && 'shimmer',
        className
      )}
      {...props}
    >
      <span className="relative z-10 mix-blend-plus-lighter">{children}</span>
      <span className="pointer-events-none absolute inset-0 rounded-full opacity-60 blur-3xl" />
    </button>
  )
}
