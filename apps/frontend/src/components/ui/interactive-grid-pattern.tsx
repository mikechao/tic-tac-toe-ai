import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

interface InteractiveGridPatternProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Size of each grid cell in pixels.
   * @default 40
   */
  size?: number
  /**
   * Color of the grid stroke.
   * @default var(--border)
   */
  stroke?: string
  /**
   * Optional radial mask to fade the grid toward the edges.
   * @default true
   */
  mask?: boolean
}

export function InteractiveGridPattern({
  className,
  size = 40,
  stroke = 'var(--border)',
  mask = true,
  children,
  ...props
}: InteractiveGridPatternProps) {
  return (
    <div className={cn('relative isolate size-full', className)} {...props}>
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 -z-10 bg-transparent',
          mask && 'grid-mask',
        )}
        style={{
          backgroundImage: `
            linear-gradient(90deg, ${stroke} 1px, transparent 1px),
            linear-gradient(180deg, ${stroke} 1px, transparent 1px)
          `,
          backgroundSize: `${size}px ${size}px`,
          opacity: mask ? 0.5 : 0.8,
        }}
      />
      {children}
    </div>
  )
}
