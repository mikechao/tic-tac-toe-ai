import { useMemo } from 'react'

import type { MatchListResponse } from '@arena/schema'

import { demoModels } from '@/data/demo.models'
import { cn } from '@/lib/utils'
import { MagicCard, NumberTicker, StateMessage } from '@/components/ui'

type MatchSummary = MatchListResponse['matches'][number]

const mockTelemetry = {
  activeModel: 'modelB' as const,
  countdownSeconds: 12,
  streak: 3,
  averageMoveSeconds: 2.4,
  lastMove: {
    model: 'modelA' as const,
    coordinate: 'B2',
    rationale: 'Secured center control to threaten dual lines.',
  },
}

export function MatchTelemetry({ match }: { match?: MatchSummary }) {
  const modelA = useMemo(() => {
    if (!match) return undefined
    return demoModels.find((model) => model.id === match.modelAId)
  }, [match])

  const modelB = useMemo(() => {
    if (!match) return undefined
    return demoModels.find((model) => model.id === match.modelBId)
  }, [match])

  if (!match) {
    return (
      <MagicCard
        className="border-white/15 bg-white/[0.04] px-0 py-0"
        spotlight={false}
      >
        <div className="flex h-full items-center justify-center rounded-[1.45rem] bg-[#0b1026]/70 px-6 py-8">
          <StateMessage
            title="Telemetry unavailable"
            description="We couldn’t load live stats for this session yet. Start a match or retry after the next sync."
          />
        </div>
      </MagicCard>
    )
  }

  const activeModel =
    mockTelemetry.activeModel === 'modelA' ? modelA : (modelB ?? modelA)
  const activeAccent =
    mockTelemetry.activeModel === 'modelA'
      ? 'from-[#4ff2c2]/40 via-[#4ff2c2]/20'
      : 'from-[#f15bb5]/35 via-[#f15bb5]/20'

  return (
    <MagicCard
      className={cn(
        'relative border-white/15 bg-white/[0.04] px-0 py-0',
        'overflow-hidden',
      )}
      spotlight={false}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 -z-10 bg-gradient-to-br to-[#0b1026] opacity-90 blur-xl transition-opacity duration-300',
          activeAccent,
        )}
      />
      <div className="relative flex h-full flex-col gap-6 rounded-[1.45rem] bg-[#0b1026]/70 px-6 py-6 backdrop-blur">
        <header className="space-y-1 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Live Match Telemetry
          </p>
          <h3 className="font-display text-xl">
            {activeModel?.name ?? 'Active model'} thinking…
          </h3>
          <p className="text-sm text-white/70">
            Countdown and streak insights update in real time while models duel.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <TelemetryStat
            label="Countdown"
            suffix="s"
            value={mockTelemetry.countdownSeconds}
            emphasis="text-emerald-300"
          />
          <TelemetryStat
            label="Current streak"
            prefix="×"
            value={mockTelemetry.streak}
            emphasis="text-[#f15bb5]"
          />
          <TelemetryStat
            label="Avg move time"
            suffix="s"
            value={mockTelemetry.averageMoveSeconds}
            emphasis="text-[#ffb547]"
            decimalPlaces={1}
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          <p className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            <span>Last move</span>
            <span>
              {(mockTelemetry.lastMove.model === 'modelA'
                ? modelA?.name
                : modelB?.name) ?? 'Model'}{' '}
              at {mockTelemetry.lastMove.coordinate}
            </span>
          </p>
          <p className="mt-2 text-base text-white">
            “{mockTelemetry.lastMove.rationale}”
          </p>
        </div>
      </div>
    </MagicCard>
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
  value: number
  prefix?: string
  suffix?: string
  emphasis?: string
  decimalPlaces?: number
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
      <p className="text-xs uppercase tracking-[0.3em] text-white/50">
        {label}
      </p>
      <div className="mt-2 flex items-end gap-1">
        {prefix ? (
          <span className="text-sm font-semibold text-white/60">{prefix}</span>
        ) : null}
        <NumberTicker
          value={value}
          decimalPlaces={decimalPlaces}
          className={cn('text-3xl font-semibold text-white', emphasis)}
        />
        {suffix ? (
          <span className="text-sm font-semibold text-white/60">{suffix}</span>
        ) : null}
      </div>
    </div>
  )
}
