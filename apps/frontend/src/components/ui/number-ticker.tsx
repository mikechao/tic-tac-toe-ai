import { useEffect, useState } from 'react'
import {
  useMotionValue,
  useSpring,
  useTransform,
  useMotionValueEvent,
} from 'motion/react'

import { cn } from '@/lib/utils'

interface NumberTickerProps {
  value: number
  className?: string
  /**
   * Number of fractional digits to display.
   * @default 0
   */
  decimalPlaces?: number
  /**
   * Number format options passed to Intl.NumberFormat.
   */
  formatOptions?: Intl.NumberFormatOptions
  /**
   * Animation duration in seconds.
   * @default 1.2
   */
  duration?: number
}

export function NumberTicker({
  value,
  className,
  decimalPlaces = 0,
  formatOptions,
  duration = 1.2,
}: NumberTickerProps) {
  const baseValue = useMotionValue(value)
  const springValue = useSpring(baseValue, {
    stiffness: 120,
    damping: 25,
    duration,
  })
  const [displayValue, setDisplayValue] = useState(
    format(value, decimalPlaces, formatOptions),
  )

  useEffect(() => {
    baseValue.set(value)
  }, [value, baseValue])

  const transformed = useTransform(springValue, (latest) =>
    format(latest, decimalPlaces, formatOptions),
  )

  useMotionValueEvent(transformed, 'change', (latest) => {
    setDisplayValue(latest)
  })

  return (
    <span className={cn('tabular-nums tracking-tight', className)}>
      {displayValue}
    </span>
  )
}

function format(
  value: number,
  decimalPlaces: number,
  formatOptions?: Intl.NumberFormatOptions,
) {
  const formatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimalPlaces,
    minimumFractionDigits: decimalPlaces,
    ...formatOptions,
  })
  return formatter.format(value ?? 0)
}
