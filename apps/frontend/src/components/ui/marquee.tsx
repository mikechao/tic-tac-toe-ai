import type { HTMLAttributes } from 'react'
import { useMemo } from 'react'

import { cn } from '@/lib/utils'

interface MarqueeProps extends HTMLAttributes<HTMLDivElement> {
  reverse?: boolean
  pauseOnHover?: boolean
  repeat?: number
  vertical?: boolean
}

export function Marquee({
  className,
  children,
  reverse = false,
  pauseOnHover = false,
  repeat = 4,
  vertical = false,
  ...props
}: MarqueeProps) {
  const loops = useMemo(
    () => Array.from({ length: repeat }, (_, index) => `loop-${index}`),
    [repeat],
  )

  return (
    <div
      className={cn(
        'group overflow-hidden',
        vertical ? 'flex flex-col' : 'flex flex-row',
        className,
      )}
      {...props}
    >
      {loops.map((loopKey) => (
        <div
          key={loopKey}
          className={cn(
            'flex shrink-0 gap-6 px-4 py-2',
            vertical
              ? 'animate-marquee-vertical flex-col'
              : 'animate-marquee flex-row',
            reverse && '[animation-direction:reverse]',
            pauseOnHover && 'group-hover:[animation-play-state:paused]',
          )}
          style={{
            animationDuration: 'var(--marquee-duration, 30s)',
          }}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
