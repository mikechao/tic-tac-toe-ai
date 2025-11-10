import { NumberTicker } from '@/components/ui'
import type {
  DemoLeaderboardViewEntry,
  RecentResult,
} from '@/data/demo.leaderboard'
import { getProviderMeta } from '@/data/models'
import { cn } from '@/lib/utils'

const resultColor: Record<RecentResult, string> = {
  W: 'bg-[#4ff2c2]/20 text-[#4ff2c2]',
  L: 'bg-[#f15bb5]/25 text-[#f15bb5]',
  T: 'bg-[#ffb547]/20 text-[#ffb547]',
}

const streakLabel: Record<DemoLeaderboardViewEntry['streak']['type'], string> =
  {
    win: 'Win streak',
    loss: 'Loss streak',
    tie: 'Tie streak',
  }

export function LeaderboardCard({
  entry,
}: {
  entry: DemoLeaderboardViewEntry
}) {
  const modelName = entry.model?.name ?? `Model ${entry.modelId}`
  const variant = entry.model?.variant ?? 'Variant TBD'
  const providerMeta = entry.model
    ? getProviderMeta(entry.model.provider)
    : { label: 'Unknown provider', badgeClass: 'border-white/20 bg-white/10 text-white/60' }
  const opponentName =
    entry.opponent?.name ?? `Model ${entry.lastMatchup.opponentId}`

  return (
    <div className="flex h-full flex-col gap-4 rounded-[1.75rem] border border-white/12 bg-white/[0.04] p-6 text-white backdrop-blur">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Rank {entry.rank.toString().padStart(2, '0')}
          </p>
          <h3 className="font-display text-xl leading-tight">{modelName}</h3>
          <p className="text-sm text-white/60">{variant}</p>
        </div>
        <span
          className={cn(
            'rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] text-white',
            providerMeta.badgeClass,
          )}
        >
          {providerMeta.label}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Wins" value={entry.wins} emphasis="text-[#4ff2c2]" />
        <Stat label="Losses" value={entry.losses} emphasis="text-[#f15bb5]" />
        <Stat label="Ties" value={entry.ties} emphasis="text-[#ffb547]" />
        <Stat
          label="Win rate"
          value={entry.winRate * 100}
          suffix="%"
          decimalPlaces={1}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
        <span className="text-xs uppercase tracking-[0.3em] text-white/50">
          {streakLabel[entry.streak.type]}
        </span>
        <span className="text-base font-semibold text-white">
          ×{entry.streak.length}
        </span>
        <span className="text-xs uppercase tracking-[0.3em] text-white/40">
          Avg turns {entry.averageTurns.toFixed(1)}
        </span>
      </div>

      <div className="space-y-2 rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.3em] text-white/50">
            Recent form
          </span>
          <span className="text-xs uppercase tracking-[0.3em] text-white/40">
            Last {entry.recentForm.length}
          </span>
        </div>
        <div className="flex gap-2">
          {entry.recentForm.map((result, index) => (
            <span
              key={`${entry.modelId}-form-${index}`}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-sm font-semibold',
                resultColor[result],
              )}
            >
              {result}
            </span>
          ))}
        </div>
      </div>

      <footer className="mt-auto space-y-1 text-sm text-white/70">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">
          Last matchup
        </p>
        <p>
          {opponentName}{' '}
          <span
            className={cn(
              'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.25em]',
              resultColor[entry.lastMatchup.result],
            )}
          >
            {entry.lastMatchup.result}
          </span>
        </p>
        <p>
          {new Date(entry.lastMatchup.playedAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </footer>
    </div>
  )
}

function Stat({
  label,
  value,
  emphasis,
  suffix,
  decimalPlaces,
}: {
  label: string
  value: number
  emphasis?: string
  suffix?: string
  decimalPlaces?: number
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.3em] text-white/50">
        {label}
      </p>
      <div className="mt-1 flex items-end gap-1">
        <NumberTicker
          value={value}
          decimalPlaces={decimalPlaces}
          className={cn('text-2xl font-semibold text-white', emphasis)}
        />
        {suffix ? (
          <span className="text-sm font-semibold text-white/60">{suffix}</span>
        ) : null}
      </div>
    </div>
  )
}
