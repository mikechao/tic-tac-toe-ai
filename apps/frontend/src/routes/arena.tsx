import { createFileRoute } from '@tanstack/react-router'

import { demoMatches } from '@/data/demo.matches'
import { Globe } from '@/components/ui/globe'
import {
  BentoCard,
  BentoGrid,
  MagicCard,
  NumberTicker,
  RainbowButton,
  WarpBackground,
} from '@/components/ui'
import { GeminiSupportGate } from '@/components/gemini/GeminiSupportGate'
import { useGeminiContext } from '@/integrations/gemini/context'

export const Route = createFileRoute('/arena')({
  component: ArenaRoute,
})

function ArenaRoute() {
  const featuredMatch = demoMatches.matches[0]

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
      <section className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <WarpBackground className="p-8">
          <div className="flex flex-col gap-6 text-white">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/70">
                Live Arena
              </p>
              <h1 className="font-display text-3xl font-semibold text-white">
                Tic Tac Toe Showdown
              </h1>
              <p className="text-white/70">
                Placeholder board area – hook up the interactive board component
                here.
              </p>
            </div>
            <MagicCard>
              <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Current Match
                </p>
                <p className="text-lg font-semibold text-white">
                  Model {featuredMatch.modelAId} vs Model{' '}
                  {featuredMatch.modelBId}
                </p>
                <div className="flex items-center gap-6 text-sm text-white/70">
                  <span>
                    Rounds
                    <NumberTicker
                      value={featuredMatch.totalRounds}
                      className="ml-2 text-base font-semibold text-white"
                    />
                  </span>
                  <span>
                    Created{' '}
                    {new Date(featuredMatch.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </MagicCard>
          </div>
        </WarpBackground>

        <GeminiSupportGate>
          <MagicCard>
            <div className="flex flex-col gap-5 text-white">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Match Controls
                </p>
                <h2 className="font-display text-2xl">
                  Configure the showdown
                </h2>
                <p className="text-sm text-white/70">
                  This is a placeholder for the upcoming match configuration
                  panel (model selectors, difficulty, rounds).
                </p>
              </div>
              <GeminiStatusIndicator />
              <RainbowButton
                type="button"
                disabled
                className="uppercase tracking-[0.25em]"
              >
                Start Match
              </RainbowButton>
            </div>
          </MagicCard>
        </GeminiSupportGate>
      </section>

      <section>
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Upcoming
        </p>
        <h3 className="font-display text-xl text-white">Arena Overview</h3>
        <BentoGrid className="mt-4">
          <BentoCard colSpanClassName="md:col-span-4">
            <p className="text-sm text-white/70">Match telemetry placeholder</p>
          </BentoCard>
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

function GeminiStatusIndicator() {
  const { status, progress, error } = useGeminiContext()

  if (status === 'ready') {
    return (
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-emerald-300/80">
        Gemini Nano ready for local inference
      </p>
    )
  }

  if (status === 'downloading') {
    const percent =
      progress == null
        ? null
        : Math.min(100, Math.max(0, Math.round(progress * 100)))
    return (
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">
        Downloading Gemini Nano{percent != null ? ` · ${percent}%` : ''}
      </p>
    )
  }

  if (status === 'downloadable') {
    return (
      <p className="text-xs uppercase tracking-[0.3em] text-sky-300/80">
        Gemini Nano download required
      </p>
    )
  }

  if (status === 'unsupported') {
    return (
      <p className="text-xs uppercase tracking-[0.3em] text-amber-300/80">
        Built-in AI unavailable
      </p>
    )
  }

  if (status === 'error') {
    return (
      <p className="text-xs uppercase tracking-[0.3em] text-rose-300/80">
        {error instanceof Error ? error.message : 'Gemini init error'}
      </p>
    )
  }

  return (
    <p className="text-xs uppercase tracking-[0.3em] text-white/60">
      Checking Gemini status…
    </p>
  )
}
