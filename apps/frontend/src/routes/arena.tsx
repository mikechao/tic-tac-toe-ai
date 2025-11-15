import { createFileRoute } from '@tanstack/react-router'
import { WarpBackground } from '@/components/ui'
import { GeminiSupportGate } from '@/components/gemini/GeminiSupportGate'
import { MatchControls } from '@/components/arena/MatchControls'
import { MatchBoard } from '@/components/arena/MatchBoard'
import { MatchTelemetry } from '@/components/arena/MatchTelemetry'
import { MatchMoveLog } from '@/components/arena/MatchMoveLog'
import { PlayerBadges } from '@/components/arena/PlayerBadges'
import { BuiltInAIProvider } from '@/integrations/gemini/context'
import { useLocalModelAvailability } from '@/hooks/useLocalModelAvailability'
import { useGameLoop } from '@/integrations/game-loop/context'
import { localAIModels } from '@/data/models'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/arena')({
  component: ArenaRoute,
})

function ArenaRoute() {
  return (
    <BuiltInAIProvider>
      <ArenaContent />
    </BuiltInAIProvider>
  )
}

function ArenaContent() {
  const defaultModelId =
    localAIModels.find((model) => model.provider === 'chrome-builtin')?.id ??
    localAIModels[0]?.id ??
    1

  const { status } = useLocalModelAvailability(defaultModelId)
  const { state } = useGameLoop()

  const isGeminiSupported = status === 'ready'
  const isMatchActive = state.phase === 'running' || state.phase === 'initializing' || state.phase === 'betweenRounds'
  const shouldShowBoard = isMatchActive

  // Show controls when match is completed, canceled, or not active
  const shouldShowControls = !isMatchActive || state.phase === 'completed' || state.phase === 'match-canceled'

  return (
    <main className="px-4 py-2 md:px-6 overflow-hidden">
      {isGeminiSupported ? (
        <div className="relative w-full">
          {/* Match Controls - slides out to the left when match starts */}
          <div
            className={cn(
              "w-full transition-all duration-700 ease-in-out z-10",
              shouldShowControls ? "opacity-100 relative" : "opacity-0 -translate-x-full absolute inset-0"
            )}
          >
            <GeminiSupportGate>
              <MatchControls />
            </GeminiSupportGate>
          </div>

          {/* Game View - slides in from the right when match starts */}
          <div
            className={cn(
              "w-full transition-all duration-700 ease-in-out",
              shouldShowBoard ? "opacity-100 relative" : "opacity-0 absolute inset-0 translate-x-full"
            )}
          >
            <div className="grid gap-8 lg:grid-cols-[2.7fr_2.3fr]">
              {/* Left Container: MatchBoard */}
              <div style={{height: '650px'}}>
                <div className="h-full border border-white/10 rounded-2xl bg-white/4">
                  <WarpBackground className="p-4 h-full rounded-2xl">
                    <MatchBoard />
                  </WarpBackground>
                </div>
              </div>

              {/* Right Container: Player Badges + MatchMoveLog */}
              <div style={{height: '650px'}}>
                <div className="h-full border border-white/10 rounded-2xl bg-white/4 p-6">
                  <div className="flex flex-col h-full gap-6">
                    <PlayerBadges />
                    <div className="flex-1 min-h-0">
                      <MatchMoveLog />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MatchTelemetry - spans full width */}
            <div className="mt-8">
              <MatchTelemetry />
            </div>
          </div>
        </div>
      ) : (
        <section className="flex justify-center w-full">
          <GeminiSupportGate>
            <MatchControls />
          </GeminiSupportGate>
        </section>
      )}
    </main>
  )
}
