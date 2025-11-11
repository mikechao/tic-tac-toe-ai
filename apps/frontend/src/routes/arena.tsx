import { createFileRoute } from '@tanstack/react-router'
import { BentoGrid, WarpBackground } from '@/components/ui'
import { GeminiSupportGate } from '@/components/gemini/GeminiSupportGate'
import { MatchControls } from '@/components/arena/MatchControls'
import { MatchBoard } from '@/components/arena/MatchBoard'
import { MatchTelemetry } from '@/components/arena/MatchTelemetry'
import { MatchMoveLog } from '@/components/arena/MatchMoveLog'
import { BuiltInAIProvider } from '@/integrations/gemini/context'
import { useLocalModelAvailability } from '@/hooks/useLocalModelAvailability'
import { localAIModels } from '@/data/models'

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

  const isGeminiSupported = status === 'ready'

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-2 py-10 md:px-4">
      {isGeminiSupported ? (
        <>
          <section className="grid gap-6 lg:grid-cols-[2fr_3fr]">
            <GeminiSupportGate>
              <MatchControls />
            </GeminiSupportGate>

            <WarpBackground className="p-4">
              <MatchBoard />
            </WarpBackground>
          </section>

          <section>
            <BentoGrid className="mt-4">
              <div className="col-span-12 md:col-span-6">
                <MatchTelemetry />
              </div>
              <div className="col-span-12 md:col-span-6">
                <MatchMoveLog />
              </div>
            </BentoGrid>
          </section>
        </>
      ) : (
        <section className="flex justify-center">
          <GeminiSupportGate>
            <MatchControls />
          </GeminiSupportGate>
        </section>
      )}
    </main>
  )
}
