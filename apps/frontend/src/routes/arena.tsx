import { createFileRoute } from '@tanstack/react-router'

import { demoMatches } from '@/data/demo.matches'
import { Globe } from '@/components/ui/globe'
import { BentoCard, BentoGrid, WarpBackground } from '@/components/ui'
import { GeminiSupportGate } from '@/components/gemini/GeminiSupportGate'
import { MatchControls } from '@/components/arena/MatchControls'
import { MatchBoard } from '@/components/arena/MatchBoard'
import { MatchTelemetry } from '@/components/arena/MatchTelemetry'

export const Route = createFileRoute('/arena')({
  component: ArenaRoute,
})

function ArenaRoute() {
  const featuredMatch = demoMatches.matches[0]

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
      <section className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <WarpBackground className="p-8">
          <MatchBoard match={featuredMatch} />
        </WarpBackground>

        <GeminiSupportGate>
          <MatchControls />
        </GeminiSupportGate>
      </section>

      <section>
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Upcoming
        </p>
        <h3 className="font-display text-xl text-white">Arena Overview</h3>
        <BentoGrid className="mt-4">
          <div className="col-span-12 md:col-span-4">
            <MatchTelemetry match={featuredMatch} />
          </div>
          <BentoCard colSpanClassName="md:col-span-4">
            <p className="text-sm text-white/70">Move log placeholder</p>
          </BentoCard>
          <BentoCard colSpanClassName="md:col-span-4">
            <p className="text-sm text-white/70">AI reasoning placeholder</p>
          </BentoCard>
        </BentoGrid>
      </section>

      <div className="relative hidden h-32 overflow-hidden rounded-3xl border border-white/10 md:block">
        <Globe />
      </div>
    </main>
  )
}
