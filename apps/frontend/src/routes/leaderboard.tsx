
import { createFileRoute } from '@tanstack/react-router'

import { LeaderboardCard } from '@/components/leaderboard/LeaderboardCard'
import { useLeaderboard } from '@/hooks/useLeaderboard'

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardRoute,
})

function LeaderboardRoute() {
  const { data: entries = [], isLoading, error } = useLeaderboard()

  if (isLoading) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Leaderboard
          </p>
          <h1 className="font-display text-3xl text-white">
            Model performance snapshot
          </h1>
          <p className="text-sm text-white/70">
            Track cross-model win rates, streaks, and performance across the
            arena.
          </p>
        </header>

        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
            <p className="text-white/60">Loading leaderboard data...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Leaderboard
          </p>
          <h1 className="font-display text-3xl text-white">
            Model performance snapshot
          </h1>
          <p className="text-sm text-white/70">
            Track cross-model win rates, streaks, and performance across the
            arena.
          </p>
        </header>

        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-white/60">Failed to load leaderboard data.</p>
            <p className="text-sm text-white/40">Please try again later.</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Leaderboard
        </p>
        <h1 className="font-display text-3xl text-white">
          Model performance snapshot
        </h1>
        <p className="text-sm text-white/70">
          Track cross-model win rates, streaks, and performance across the
          arena. Models need <span className="font-semibold">5 rounds of gameplay</span> to be ranked.
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-white/60">No match data available yet.</p>
            <p className="text-sm text-white/40">Start playing matches to see leaderboard rankings. Models need 5 rounds to be ranked.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {entries.map((entry) => (
            <LeaderboardCard key={entry.modelId} entry={entry} />
          ))}
        </div>
      )}
    </main>
  )
}
