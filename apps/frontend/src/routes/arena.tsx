import { createFileRoute } from '@tanstack/react-router'

import { demoMatches } from '@/data/demo.matches'
import { BentoGrid, WarpBackground } from '@/components/ui'
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
      <section className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <GeminiSupportGate>
          <MatchControls />
        </GeminiSupportGate>

        <WarpBackground className="p-4">
          <MatchBoard match={featuredMatch} />
        </WarpBackground>
      </section>

      <section>
        <BentoGrid className="mt-4">
          <div className="col-span-12 md:col-span-6">
            <MatchTelemetry match={featuredMatch} />
          </div>
          <div className="col-span-12 md:col-span-6">
            <MatchMoveLog match={featuredMatch} />
          </div>
        </BentoGrid>
      </section>
    </main>
  )
}
