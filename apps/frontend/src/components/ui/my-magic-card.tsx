import type { HTMLAttributes } from 'react'
import { useCallback, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

interface MyMagicCardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Enable the interactive spotlight effect on hover.
   * @default true
   */
  spotlight?: boolean
}

export function MyMagicCard({
  className,
  children,
  spotlight = true,
  ...props
}: MyMagicCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [spotlightPosition, setSpotlightPosition] = useState({ x: 50, y: 50 })

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!spotlight || !ref.current) return
      const bounds = ref.current.getBoundingClientRect()
      const x = ((event.clientX - bounds.left) / bounds.width) * 100
      const y = ((event.clientY - bounds.top) / bounds.height) * 100
      setSpotlightPosition({ x, y })
    },
    [spotlight],
  )

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setSpotlightPosition({ x: 50, y: 50 })}
      className={cn(
        'group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[var(--surface)] p-[1px]',
        'transition-shadow duration-300 hover:shadow-[0_20px_120px_rgba(241,91,181,0.2)]',
        className,
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at ${spotlightPosition.x}% ${spotlightPosition.y}%, rgba(79,242,194,0.25), transparent 45%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(79,242,194,0.1),rgba(241,91,181,0.15),rgba(255,181,71,0.12))]" />
      <div className="relative rounded-[1.45rem] bg-[var(--muted-surface)]/70 p-6 backdrop-blur">
        {children}
      </div>
    </div>
  )
}
