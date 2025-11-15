import { ModelLeaderBoardStats } from './ModelLeaderBoardStats'
import { ModelReliabilityBadge } from './ModelReliabilityBadge'
import type { LeaderboardViewEntry } from '@/hooks/useLeaderboard'
import { getProviderMeta } from '@/data/models'
import { cn } from '@/lib/utils'



export function LeaderboardCard({
  entry,
}: {
  entry: LeaderboardViewEntry
}) {
  const modelName = entry.model?.name ?? `Model ${entry.modelId}`
  const variant = entry.model?.variant ?? 'Variant TBD'
  const providerMeta = entry.model
    ? getProviderMeta(entry.model.provider)
    : { label: 'Unknown provider', badgeClass: 'border-white/20 bg-white/10 text-white/60' }
  const opponentName =
    entry.opponent?.name ?? (entry.lastMatchup?.opponentId ? `Model ${entry.lastMatchup.opponentId}` : 'Unknown opponent')

  return (
    <div className="flex h-full flex-col gap-4 rounded-[1.75rem] border border-white/12 bg-white/[0.04] p-6 text-white backdrop-blur">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            {entry.rank ? `Rank ${entry.rank.toString().padStart(2, '0')}` : `Unranked (${entry.matches}/5 rounds)`}
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

      {/* JSON Reliability Section - only show for Transformers.js */}
      {entry.model?.provider === 'transformers-js' && (
        <div className="border-t border-white/12 pt-4">
          <ModelReliabilityBadge modelLabel={entry.model?.name || 'SmolLM2'} />
        </div>
      )}

      <ModelLeaderBoardStats
      wins={entry.wins}
      losses={entry.losses}
      ties={entry.ties}
      winRate={entry.winRate}
      streakType={entry.streak.type}
      streakLength={entry.streak.length}
      averageTurns={entry.averageTurns}
      lastMatchup={
        entry.lastMatchup?.result && entry.lastMatchup?.playedAt
          ? {
              opponentName,
              result: entry.lastMatchup.result,
              playedAt: entry.lastMatchup.playedAt,
            }
          : undefined
      }
      recentForm={entry.recentForm}
    />
    </div>
  )
}
