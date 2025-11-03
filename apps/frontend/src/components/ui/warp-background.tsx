import type { HTMLAttributes } from 'react'
import { motion } from 'motion/react'
import { useMemo } from 'react'

import { cn } from '@/lib/utils'
import { InteractiveGridPattern } from './interactive-grid-pattern'

type WarpBackgroundProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * How many glowing beams to render on each edge.
   * @default 4
   */
  beams?: number
}

export function WarpBackground({
  className,
  beams = 4,
  children,
  ...props
}: WarpBackgroundProps) {
  const beamArray = useMemo(
    () =>
      Array.from({ length: beams }, (_, index) => ({
        id: `beam-${index}`,
        offset: index,
      })),
    [beams]
  )

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(79,242,194,0.15),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(241,91,181,0.15),_transparent_60%)]',
        className
      )}
      {...props}
    >
      <InteractiveGridPattern className="absolute inset-0 -z-10 opacity-60" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-black/40" />

      {/* Animated beams */}
      {beamArray.map((beam) => (
        <motion.span
          key={beam.id}
          className="pointer-events-none absolute inset-x-0 top-0 block h-48 w-[6px] origin-top rounded-full bg-gradient-to-b from-[rgba(79,242,194,0.6)] via-transparent to-transparent blur-[2px]"
          style={{ left: `${(beam.offset / beams) * 100}%` }}
          animate={{ opacity: [0.1, 0.6, 0.1], scaleY: [1, 1.3, 1] }}
          transition={{
            duration: 3 + beam.offset * 0.2,
            repeat: Infinity,
            delay: beam.offset * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}

      <div className="relative z-10">{children}</div>
    </div>
  )
}
