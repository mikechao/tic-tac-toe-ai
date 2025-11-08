import { useEffect, useMemo, useRef, useState } from 'react'

import type { ModelId } from '@arena/schema'

import { localAIModels } from '@/data/models'
import { cn } from '@/lib/utils'
import {
  BentoCard,
  BentoGrid,
  MagicCard,
  MarkAvatar,
  MyMagicCard,
  RainbowButton,
  useToast,
} from '@/components/ui'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBuiltInAI } from '@/integrations/gemini/context'
import { useGameLoop } from '@/integrations/game-loop/context'
import type { MatchConfig } from '@/lib/game/game-loop'

type ModelOption = (typeof localAIModels)[number]

const modelSelectTriggerClassName =
  'mt-1 !w-full justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base font-medium text-white/90 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ff2c2]/70 focus-visible:ring-inset'
const modelSelectContentClassName =
  'border-white/15 bg-[#0b1026]/95 text-white/80 backdrop-blur-xl max-w-[calc(100vw-3rem)]'
const modelSelectItemClassName =
  'text-white/80 data-[state=checked]:text-white data-[highlighted]:bg-white/10 data-[state=checked]:bg-[#4ff2c2]/10'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

const DEFAULT_BOARD_SIZE = 3
const DEFAULT_STARTING_PLAYER: MatchConfig['startingPlayer'] = 'alternate'
const DEFAULT_MOVE_TIMEOUT_MS = 30_000

type ModelSelectProps = {
  id: string
  srLabel: string
  value: ModelId
  onValueChange: (value: ModelId) => void
  options: Array<ModelOption>
  disabled?: boolean
}

function ModelSelect({
  id,
  srLabel,
  value,
  onValueChange,
  options,
  disabled = false,
}: ModelSelectProps) {
  const labelId = `${id}-label`
  return (
    <div>
      <span id={labelId} className="sr-only">
        {srLabel}
      </span>
      <Select
        value={String(value)}
        onValueChange={(nextValue) =>
          onValueChange(Number(nextValue) as ModelId)
        }
        disabled={disabled}
      >
        <SelectTrigger
          aria-labelledby={labelId}
          className={cn(
            modelSelectTriggerClassName,
            disabled && 'cursor-not-allowed opacity-50',
          )}
          disabled={disabled}
        >
          <SelectValue placeholder="Choose a model" />
        </SelectTrigger>
        <SelectContent
          className={modelSelectContentClassName}
          position="popper"
          sideOffset={4}
        >
          {options.map((option) => (
            <SelectItem
              key={option.id}
              value={String(option.id)}
              className={modelSelectItemClassName}
            >
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function MatchControls() {
  const { status } = useBuiltInAI()
  const { state, configure, start } = useGameLoop()
  const { showToast } = useToast()

  const availableModels = useMemo(
    () => localAIModels.filter((model) => model.provider === 'Google DeepMind'),
    [],
  )
  const defaultModelId = availableModels[0]?.id ?? localAIModels[0]?.id ?? 1

  const [modelAId, setModelAId] = useState<ModelId>(defaultModelId)
  const [modelBId, setModelBId] = useState<ModelId>(defaultModelId)
  const [roundCount, setRoundCount] = useState<number>(5)
  const totalRounds = clamp(
    Number.isFinite(roundCount) ? roundCount : 1,
    1,
    100,
  )
  const [roundAnnouncement, setRoundAnnouncement] = useState<string>(
    `Rounds set to ${totalRounds}`,
  )
  const matchConfig = useMemo<MatchConfig>(
    () => ({
      modelAId,
      modelBId,
      boardSize: DEFAULT_BOARD_SIZE,
      totalRounds,
      startingPlayer: DEFAULT_STARTING_PLAYER,
      moveTimeoutMs: DEFAULT_MOVE_TIMEOUT_MS,
    }),
    [modelAId, modelBId, totalRounds],
  )
  const lastConfigRef = useRef<MatchConfig | null>(null)

  useEffect(() => {
    setRoundAnnouncement(`Rounds set to ${totalRounds}`)
  }, [totalRounds])

  useEffect(() => {
    if (!['idle', 'completed', 'error'].includes(state.phase)) {
      return
    }

    const previousConfig = lastConfigRef.current
    const hasConfigChanged =
      !previousConfig ||
      previousConfig.modelAId !== matchConfig.modelAId ||
      previousConfig.modelBId !== matchConfig.modelBId ||
      previousConfig.boardSize !== matchConfig.boardSize ||
      previousConfig.totalRounds !== matchConfig.totalRounds ||
      previousConfig.startingPlayer !== matchConfig.startingPlayer ||
      previousConfig.moveTimeoutMs !== matchConfig.moveTimeoutMs

    if (!hasConfigChanged) {
      return
    }

    // Keep the game loop configuration aligned with the current controls so the board reflects updates immediately.
    configure(matchConfig)
    lastConfigRef.current = matchConfig
  }, [configure, matchConfig, state.phase])

  const selectedModelA = useMemo(
    () => localAIModels.find((model) => model.id === modelAId),
    [modelAId],
  )
  const selectedModelB = useMemo(
    () => localAIModels.find((model) => model.id === modelBId),
    [modelBId],
  )

  const isRoundCountValid = totalRounds >= 1 && totalRounds <= 100
  const isConfigurationValid = isRoundCountValid

  const summaryLine = `${selectedModelA?.name ?? 'Model A'} vs ${
    selectedModelB?.name ?? 'Model B'
  }`
  const summaryDetails = `${totalRounds} ${totalRounds === 1 ? 'round' : 'rounds'}`

  const isGeminiReady = status === 'ready'
  const statusMessage = isGeminiReady
    ? 'Gemini Nano ready for local inference'
    : 'Preparing Gemini models…'
  const isBusyPhase = state.phase === 'initializing' || state.phase === 'running'
  const [isStarting, setIsStarting] = useState(false)
  const busyLabel =
    state.phase === 'initializing'
      ? 'Match preparing…'
      : 'Match running…'
  const isStartDisabled =
    !isConfigurationValid || isBusyPhase || !isGeminiReady || isStarting

  const handleRoundCountChange = (value: number) => {
    setRoundCount(clamp(Math.round(value || 1), 1, 100))
  }

  const handleStartMatch = async () => {
    if (isStartDisabled) {
      return
    }
    if (!isRoundCountValid) {
      showToast({
        title: 'Adjust configuration',
        description:
          'Ensure the round count stays between 1 and 100 before starting the match.',
        variant: 'warning',
      })
      return
    }
    if (!isGeminiReady) {
      showToast({
        title: 'Models still preparing',
        description:
          'Wait for Gemini Nano to finish downloading before starting the match.',
        variant: 'warning',
      })
      return
    }

    try {
      setIsStarting(true)
      configure(matchConfig)
      lastConfigRef.current = matchConfig
      console.debug('[MatchControls] configured match', matchConfig)
      await start()
      console.debug('[MatchControls] start command resolved')
      showToast({
        title: 'Match starting',
        description: `${selectedModelA?.name ?? 'Model A'} vs ${
          selectedModelB?.name ?? 'Model B'
        } • ${totalRounds} ${totalRounds === 1 ? 'round' : 'rounds'}.`,
        variant: 'success',
      })
    } catch (error) {
      const description =
        error instanceof Error ? error.message : 'Unknown error occurred.'
      showToast({
        title: 'Unable to start match',
        description,
        variant: 'warning',
      })
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <MyMagicCard className="relative h-full overflow-hidden">
      {isBusyPhase ? (
        <div className="pointer-events-auto absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#050918]/85 text-center text-white backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.3em]">
            {busyLabel}
          </p>
          <p className="mt-2 text-xs text-white/70">
            Controls re-enable after the current phase completes.
          </p>
        </div>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {isBusyPhase ? `${busyLabel} controls locked` : 'Controls ready'}
      </span>
      <div
        className={cn(
          'flex flex-col gap-6 text-white transition-opacity',
          isBusyPhase ? 'pointer-events-none opacity-60' : 'opacity-100',
        )}
      >
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Match Controls
          </p>
          <h2 className="font-display text-2xl">Configure the showdown</h2>
          <p className="text-sm text-white/70">
            Choose your contenders and define how long the series runs.
          </p>
        </header>

        <p className="text-xs font-medium uppercase tracking-[0.3em] text-emerald-300/80">
          {statusMessage}
        </p>

        <BentoGrid className="gap-5 md:auto-rows-auto">
          <div className="md:col-span-12">
            <MagicCard
              gradientFrom="#4ff2c2"
              gradientTo="rgba(79,242,194,0.25)"
              gradientColor="#16382f"
              className="rounded-[1.75rem] border border-white/10 bg-white/5 text-white"
            >
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 px-5 pt-4 pb-3">
                <MarkAvatar mark="X" className="size-11" />
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                  Player 1 Model Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 py-5">
                <ModelSelect
                  id="modelA"
                  srLabel="Select model A"
                  value={modelAId}
                  onValueChange={setModelAId}
                  options={availableModels}
                  disabled={isBusyPhase}
                />
                {selectedModelA ? (
                  <p className="sr-only">{selectedModelA.variant}</p>
                ) : null}
              </CardContent>
            </MagicCard>
          </div>

          <div className="md:col-span-12">
            <MagicCard
              gradientFrom="#f15bb5"
              gradientTo="rgba(241,91,181,0.25)"
              gradientColor="#3c1428"
              className="rounded-[1.75rem] border border-white/10 bg-white/5 text-white"
            >
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 px-5 pt-4 pb-3">
                <MarkAvatar mark="O" className="size-11" />
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                  Player 2 Model Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 py-5">
                <ModelSelect
                  id="modelB"
                  srLabel="Select model B"
                  value={modelBId}
                  onValueChange={setModelBId}
                  options={availableModels}
                  disabled={isBusyPhase}
                />
                {selectedModelB ? (
                  <p className="sr-only">{selectedModelB.variant}</p>
                ) : null}
              </CardContent>
            </MagicCard>
          </div>

          <BentoCard colSpanClassName="md:col-span-12" className="space-y-4">
            <fieldset
              className="space-y-4 p-0 outline-none focus-within:outline-none [border:0] m-0"
              style={{ minInlineSize: 0 }}
            >
              <legend className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                Round count
              </legend>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                  Set number of rounds
                </p>
                <p className="mt-1 text-xs text-white/60">
                  Choose between 1 and 100 rounds for this showdown.
                </p>
                <div className="mt-3 flex items-center gap-3 rounded-full bg-white/5 px-3 py-2">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-lg font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#4ff2c2]/70 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => handleRoundCountChange(totalRounds - 1)}
                    aria-label="Decrease rounds"
                    disabled={isBusyPhase}
                  >
                    –
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    value={totalRounds}
                    onChange={(event) =>
                      handleRoundCountChange(Number(event.target.value))
                    }
                    className="w-16 appearance-none bg-transparent text-center text-lg font-semibold text-white outline-none focus:outline-none disabled:cursor-not-allowed disabled:text-white/40"
                    disabled={isBusyPhase}
                    aria-label="Round count"
                  />
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-lg font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#4ff2c2]/70 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isBusyPhase}
                    onClick={() => handleRoundCountChange(totalRounds + 1)}
                    aria-label="Increase rounds"
                  >
                    +
                  </button>
                  <span className="ml-auto text-xs uppercase tracking-[0.2em] text-white/40">
                    1–100
                  </span>
                </div>
              </div>
              <div aria-live="polite" className="sr-only">
                {roundAnnouncement}
              </div>
            </fieldset>
          </BentoCard>

          <BentoCard colSpanClassName="md:col-span-12" className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              Match summary
            </p>
            <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
              <div>
                <p className="text-base font-medium text-white">
                  {summaryLine}
                </p>
                <p className="text-sm text-white/60">{summaryDetails}</p>
              </div>
              <RainbowButton
                type="button"
                disabled={isStartDisabled}
                className="w-full uppercase tracking-[0.25em] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  void handleStartMatch()
                }}
              >
                Start Match
              </RainbowButton>
            </div>
            {!isRoundCountValid ? (
              <p className="text-sm font-medium text-amber-300/80">
                Adjust the matchup to start—keep the round count between 1 and 100.
              </p>
            ) : !isGeminiReady ? (
              <p className="text-sm font-medium text-white/70">
                Gemini models are still initializing—start will unlock once the
                download finishes.
              </p>
            ) : (
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                Ready when you are — launch the battle when the arena looks
                good.
              </p>
            )}
          </BentoCard>
        </BentoGrid>
      </div>
    </MyMagicCard>
  )
}
