import { createFileRoute } from '@tanstack/react-router'
import { BentoGrid, WarpBackground } from '@/components/ui'
import { GeminiSupportGate } from '@/components/gemini/GeminiSupportGate'
import { MatchControls } from '@/components/arena/MatchControls'
import { MatchBoard } from '@/components/arena/MatchBoard'
import { MatchTelemetry } from '@/components/arena/MatchTelemetry'
import { MatchMoveLog } from '@/components/arena/MatchMoveLog'
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
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              {/* Left Column: Board and Telemetry */}
              <div className="flex flex-col gap-6">
                <WarpBackground className="p-4">
                  <MatchBoard />
                </WarpBackground>

                <MatchTelemetry />
              </div>

              {/* Right Column: Move Log */}
              <div>
                <MatchMoveLog />
              </div>
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
