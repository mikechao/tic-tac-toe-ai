import { useMemo, useState } from 'react'

import { createFileRoute } from '@tanstack/react-router'

import {
  demoLeaderboardEntries,
  demoLeaderboardHighlights,
} from '@/data/demo.leaderboard'
import { BentoGrid, Marquee, MyMagicCard, NumberTicker } from '@/components/ui'
import { LeaderboardFilters } from '@/components/leaderboard/LeaderboardFilters'
import { LeaderboardCard } from '@/components/leaderboard/LeaderboardCard'

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardRoute,
})

function LeaderboardRoute() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [family, setFamily] = useState<
    'all' | 'gemini' | 'smollm2' | 'gpt' | 'claude' | 'mistral'
  >('all')

  const filteredEntries = useMemo(() => {
    if (family === 'all') return demoLeaderboardEntries

    const matchesFamily = {
      gemini: (entry: typeof demoLeaderboardEntries[number]) =>
        entry.model?.name.toLowerCase().includes('gemini') ?? false,
      smollm2: (entry: typeof demoLeaderboardEntries[number]) =>
        entry.model?.provider === 'transformers-js',
      gpt: (entry: typeof demoLeaderboardEntries[number]) =>
        entry.model?.name.toLowerCase().includes('gpt') ?? false,
      claude: (entry: typeof demoLeaderboardEntries[number]) =>
        entry.model?.name.toLowerCase().includes('claude') ?? false,
      mistral: (entry: typeof demoLeaderboardEntries[number]) =>
        entry.model?.name.toLowerCase().includes('mistral') ?? false,
    }[family]

    return demoLeaderboardEntries.filter((entry) => matchesFamily(entry))
  }, [family])

  const totalMatches = useMemo(
    () => filteredEntries.reduce((total, entry) => total + entry.matches, 0),
    [filteredEntries],
  )

  const aggregateWinRate = useMemo(() => {
    if (!filteredEntries.length) return 0
    const totalWins = filteredEntries.reduce(
      (total, entry) => total + entry.wins,
      0,
    )
    return (totalWins / totalMatches) * 100 || 0
  }, [filteredEntries, totalMatches])

  const lastSync = useMemo(() => {
    const mostRecent = filteredEntries.reduce<number>((latest, entry) => {
      const timestamp = new Date(entry.lastMatchup.playedAt).getTime()
      return Math.max(latest, timestamp)
    }, 0)
    return mostRecent
      ? new Date(mostRecent).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—'
  }, [filteredEntries])

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
          Track cross-model win rates, streaks, and trend highlights across the
          arena. Filters adjust the scope; live data will replace these demo
          numbers once backend integration lands.
        </p>
      </header>

      <LeaderboardFilters
        selectedRange={timeRange}
        onSelectRange={setTimeRange}
        selectedFamily={family}
        onSelectFamily={setFamily}
      />

      <MyMagicCard className="border-white/15 bg-white/[0.04]" spotlight={false}>
        <div className="grid gap-6 text-white md:grid-cols-3">
          <SummaryStat label="Total matches" value={totalMatches} />
          <SummaryStat
            label="Aggregate win rate"
            value={aggregateWinRate}
            suffix="%"
            decimalPlaces={1}
          />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              Last sync
            </p>
            <p className="mt-2 text-2xl font-semibold">{lastSync}</p>
            <p className="text-sm text-white/60">
              Filters apply locally; backend sync will align with selected time
              range ({timeRange}).
            </p>
          </div>
        </div>
      </MyMagicCard>

      <section aria-label="Trend highlights">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Highlights
        </p>
        <Marquee
          className="mt-3 rounded-[1.5rem] border border-white/10 bg-white/5"
          pauseOnHover
        >
          {demoLeaderboardHighlights.map((highlight) => (
            <span
              key={highlight}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/80"
            >
              {highlight}
            </span>
          ))}
        </Marquee>
      </section>

      <BentoGrid className="gap-6">
        {filteredEntries.map((entry) => (
          <div
            key={entry.modelId}
            className="col-span-12 md:col-span-6 xl:col-span-4"
          >
            <LeaderboardCard entry={entry} />
          </div>
        ))}
      </BentoGrid>
    </main>
  )
}

function SummaryStat({
  label,
  value,
  suffix,
  decimalPlaces,
}: {
  label: string
  value: number
  suffix?: string
  decimalPlaces?: number
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">
        {label}
      </p>
      <div className="mt-2 flex items-end gap-2">
        <NumberTicker
          value={value}
          decimalPlaces={decimalPlaces}
          className="text-4xl font-semibold"
        />
        {suffix ? (
          <span className="pb-1 text-sm font-semibold text-white/60">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  )
}
