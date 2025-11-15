
import { cn } from '@/lib/utils'
import { MyMagicCard, NumberTicker, StateMessage } from '@/components/ui'
import { useGameLoop } from '@/integrations/game-loop/context'
import type { GameLoopState } from '@/lib/game/game-loop'

function computeAverageMoveSeconds(
  totalMs: number,
  count: number,
): number | undefined {
  if (count === 0) {
    return undefined
  }
  return totalMs / count / 1000
}

function computeCurrentStreak(
  summaries: GameLoopState['roundSummaries'],
): number {
  let streak = 0
  let currentWinner: 'modelA' | 'modelB' | null = null
  for (let index = summaries.length - 1; index >= 0; index -= 1) {
    const summary = summaries[index]
    if (summary.winner === 'tie') {
      break
    }
    if (!currentWinner) {
      currentWinner = summary.winner
      streak = 1
      continue
    }
    if (summary.winner === currentWinner) {
      streak += 1
    } else {
      break
    }
  }
  return streak
}

export function MatchTelemetry() {
  const { state } = useGameLoop()

  const hasConfiguredMatch =
    state.modelAId != null && state.modelBId != null && state.totalRounds > 0

  const moveHistory = state.moveHistory
  const lastMove = moveHistory.at(-1)
  const totalDurationMs = moveHistory.reduce(
    (sum, entry) => sum + entry.durationMs,
    0,
  )
  const averageMoveSeconds = computeAverageMoveSeconds(
    totalDurationMs,
    moveHistory.length,
  )
  const currentStreak = computeCurrentStreak(state.roundSummaries)
  const activeModelKey =
    state.phase === 'running' ? state.activePlayer ?? undefined : undefined

  if (!hasConfiguredMatch) {
    return (
      <MyMagicCard
        className="border-white/15 bg-white/4 px-0 py-0"
        spotlight={false}
      >
        <div className="flex h-full items-center justify-center rounded-[1.45rem] bg-[#0b1026]/70 px-6 py-8">
          <StateMessage
            title="Telemetry unavailable"
            description="We couldn’t load live stats for this session yet. Start a match or retry after the next sync."
          />
        </div>
      </MyMagicCard>
    )
  }

  const accentOwner = activeModelKey ?? lastMove?.actor ?? 'modelA'
  const activeAccent =
    accentOwner === 'modelA'
      ? 'from-[#4ff2c2]/40 via-[#4ff2c2]/20'
      : 'from-[#f15bb5]/35 via-[#f15bb5]/20'

  return (
    <MyMagicCard
      className={cn(
        'relative border-white/15 bg-white/4 px-0 py-0',
        'overflow-hidden',
      )}
      spotlight={false}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 -z-10 bg-linear-to-br to-[#0b1026] opacity-90 blur-xl transition-opacity duration-300',
          activeAccent,
        )}
      />
      <div className="relative flex h-full flex-col gap-6 rounded-[1.45rem] bg-[#0b1026]/70 px-6 py-6 backdrop-blur">
        <header className="space-y-1 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Live Match Telemetry
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <TelemetryStat
            label="Moves recorded"
            value={moveHistory.length}
            emphasis="text-emerald-300"
          />
          <TelemetryStat
            label="Current streak"
            prefix="×"
            value={currentStreak}
            emphasis="text-[#f15bb5]"
          />
          <TelemetryStat
            label="Avg move time"
            suffix="s"
            value={averageMoveSeconds}
            emphasis="text-[#ffb547]"
            decimalPlaces={1}
          />
        </div>
      </div>
    </MyMagicCard>
  )
}

function TelemetryStat({
  label,
  value,
  prefix,
  suffix,
  emphasis,
  decimalPlaces,
}: {
  label: string
  value?: number
  prefix?: string
  suffix?: string
  emphasis?: string
  decimalPlaces?: number
}) {
  return (
    <div className="rounded-2xl bg-white/5 p-3 text-white">
      <p className="text-xs uppercase tracking-[0.3em] text-white/50">
        {label}
      </p>
      <div className="mt-2 flex items-end gap-1">
        {prefix ? (
          <span className="text-sm font-semibold text-white/60">{prefix}</span>
        ) : null}
        {typeof value === 'number' ? (
          <NumberTicker
            value={value}
            decimalPlaces={decimalPlaces}
            className={cn('text-3xl font-semibold text-white', emphasis)}
          />
        ) : (
          <span className="text-3xl font-semibold text-white/30">—</span>
        )}
        {suffix ? (
          <span className="text-sm font-semibold text-white/60">{suffix}</span>
        ) : null}
      </div>
    </div>
  )
}
