type RoundProgressBarProps = {
  value: number
  className?: string
  trackClassName?: string
  indicatorClassName?: string
  isIndeterminate?: boolean
}

export function RoundProgressBar({
  value,
  className,
  trackClassName,
  indicatorClassName,
  isIndeterminate = false,
}: RoundProgressBarProps) {
  const clamped = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
  return (
    <div
      className={['mt-2 h-2 rounded-full bg-white/10', trackClassName, className]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          'h-full rounded-full bg-gradient-to-r from-[#4ff2c2] via-[#f15bb5] to-[#ffb547]',
          indicatorClassName,
          isIndeterminate && 'animate-pulse',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ width: isIndeterminate ? '20%' : `${clamped}%` }}
      />
    </div>
  )
}
