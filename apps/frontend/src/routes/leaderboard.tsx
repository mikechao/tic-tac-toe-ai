import { createFileRoute } from '@tanstack/react-router'

import { demoMatches } from '@/data/demo.matches'
import { BentoCard, BentoGrid, MagicCard, NumberTicker } from '@/components/ui'

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardRoute,
})

function LeaderboardRoute() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Leaderboard</p>
        <h1 className="font-display text-3xl text-white">Model performance snapshot</h1>
        <p className="text-sm text-white/70">
          Placeholder view – wire this page to the backend leaderboard endpoint and populate the cards below.
        </p>
      </header>

      <MagicCard>
        <div className="flex flex-wrap items-center gap-6 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Total Matches</p>
            <NumberTicker value={demoMatches.matches.length} className="text-3xl font-semibold" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Win Rate (placeholder)</p>
            <NumberTicker value={72} className="text-3xl font-semibold" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Last Sync</p>
            <span className="text-lg">Oct 1, 2025</span>
          </div>
        </div>
      </MagicCard>

      <BentoGrid>
        {demoMatches.matches.map((match) => (
          <BentoCard key={match.id} colSpanClassName="md:col-span-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Model {match.modelAId}</p>
            <h3 className="font-display text-xl text-white">vs Model {match.modelBId}</h3>
            <p className="text-sm text-white/70">Rounds: {match.totalRounds}</p>
            <p className="text-sm text-white/70">
              Created {new Date(match.createdAt).toLocaleDateString()}
            </p>
          </BentoCard>
        ))}
      </BentoGrid>
    </main>
  )
}
