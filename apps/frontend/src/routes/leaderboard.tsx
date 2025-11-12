
import { createFileRoute } from '@tanstack/react-router'

import { demoLeaderboardEntries } from '@/data/demo.leaderboard'
import { LeaderboardCard } from '@/components/leaderboard/LeaderboardCard'

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardRoute,
})

function LeaderboardRoute() {

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

      <div className="flex flex-col gap-6">
        {demoLeaderboardEntries.map((entry) => (
          <LeaderboardCard key={entry.modelId} entry={entry} />
        ))}
      </div>
    </main>
  )
}
