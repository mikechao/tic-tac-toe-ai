import { createFileRoute } from '@tanstack/react-router'

import { demoMatches } from '@/data/demo.matches'
import { BentoCard, BentoGrid, WarpBackground } from '@/components/ui'
import { GeminiSupportGate } from '@/components/gemini/GeminiSupportGate'
import { MatchControls } from '@/components/arena/MatchControls'
import { MatchBoard } from '@/components/arena/MatchBoard'
import { MatchTelemetry } from '@/components/arena/MatchTelemetry'
import { MatchMoveLog } from '@/components/arena/MatchMoveLog'

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
        <BentoGrid className="mt-4">
          <div className="col-span-12 md:col-span-4">
            <MatchTelemetry match={featuredMatch} />
          </div>
          <div className="col-span-12 md:col-span-4">
            <MatchMoveLog match={featuredMatch} />
          </div>
        </BentoGrid>
      </section>
    </main>
  )
}
