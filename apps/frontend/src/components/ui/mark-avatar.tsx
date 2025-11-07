import type { PlayerMark } from '@/lib/game/board-state'
import { cn } from '@/lib/utils'

export function MarkAvatar({
  mark,
  className,
}: {
  mark: PlayerMark
  className?: string
}) {
  const accentClass =
    mark === 'X'
      ? 'bg-[#4ff2c2]/30 border border-[#4ff2c2]/50'
      : 'bg-[#f15bb5]/25 border border-[#f15bb5]/45'

  return (
    <span
      className={cn(
        'flex size-12 items-center justify-center rounded-xl text-2xl font-semibold text-white shadow-[0_8px_24px_rgba(11,16,38,0.55)]',
        accentClass,
        className,
      )}
      aria-hidden="true"
    >
      {mark}
    </span>
  )
}
