import { useEffect, useMemo, useState } from 'react'

import type { ModelId } from '@arena/schema'

import { demoModels } from '@/data/demo.models'
import {
  BentoCard,
  BentoGrid,
  MagicCard,
  RainbowButton,
  useToast,
} from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGeminiContext } from '@/integrations/gemini/context'

type ModelOption = (typeof demoModels)[number]

const modelSelectTriggerClassName =
  'mt-3 !w-full justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base font-medium text-white/90 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ff2c2]/70 focus-visible:ring-inset'
const modelSelectContentClassName =
  'border-white/15 bg-[#0b1026]/95 text-white/80 backdrop-blur-xl max-w-[calc(100vw-3rem)]'
const modelSelectItemClassName =
  'text-white/80 data-[state=checked]:text-white data-[highlighted]:bg-white/10 data-[state=checked]:bg-[#4ff2c2]/10'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

type ModelSelectProps = {
  id: string
  srLabel: string
  value: ModelId
  onValueChange: (value: ModelId) => void
  options: Array<ModelOption>
}

function ModelSelect({
  id,
  srLabel,
  value,
  onValueChange,
  options,
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
      >
        <SelectTrigger
          aria-labelledby={labelId}
          className={modelSelectTriggerClassName}
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
  const { status } = useGeminiContext()
  const { showToast } = useToast()

  const availableModels = useMemo(
    () => demoModels.filter((model) => model.name === 'Gemini Nano'),
    [],
  )
  const defaultModelId = availableModels[0]?.id ?? 1

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

  useEffect(() => {
    setRoundAnnouncement(`Rounds set to ${totalRounds}`)
  }, [totalRounds])

  const selectedModelA = useMemo(
    () => demoModels.find((model) => model.id === modelAId),
    [modelAId],
  )
  const selectedModelB = useMemo(
    () => demoModels.find((model) => model.id === modelBId),
    [modelBId],
  )

  const isConfigurationValid = totalRounds >= 1 && totalRounds <= 100

  const summaryLine = `${selectedModelA?.name ?? 'Model A'} vs ${
    selectedModelB?.name ?? 'Model B'
  }`
  const summaryDetails = `${totalRounds} ${totalRounds === 1 ? 'round' : 'rounds'}`

  const statusMessage =
    status === 'ready'
      ? 'Gemini Nano ready for local inference'
      : 'Preparing Gemini models…'

  const handleRoundCountChange = (value: number) => {
    setRoundCount(clamp(Math.round(value || 1), 1, 100))
  }

  const handleStartMatch = () => {
    if (!isConfigurationValid) {
      showToast({
        title: 'Adjust configuration',
        description:
          'Select distinct models and ensure rounds stay between 1 and 100 before starting the match.',
        variant: 'warning',
      })
      return
    }
    showToast({
      title: 'Match queued',
      description: `${selectedModelA?.name ?? 'Model A'} vs ${
        selectedModelB?.name ?? 'Model B'
      } • ${totalRounds} ${
        totalRounds === 1 ? 'round' : 'rounds'
      }. Rematch ready when results persist.`,
      variant: 'success',
    })
  }

  return (
    <MagicCard className="h-full">
      <div className="flex flex-col gap-6 text-white">
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
          <BentoCard colSpanClassName="md:col-span-12">
            <fieldset className="space-y-3">
              <legend className="flex items-center justify-between text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                Player 1 Model Selection
              </legend>
              <ModelSelect
                id="modelA"
                srLabel="Select model A"
                value={modelAId}
                onValueChange={setModelAId}
                options={availableModels}
              />
              {selectedModelA ? (
                <p className="sr-only">{selectedModelA.variant}</p>
              ) : null}
            </fieldset>
          </BentoCard>

          <BentoCard colSpanClassName="md:col-span-12">
            <fieldset className="space-y-3">
              <legend className="flex items-center justify-between text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                Player 2 Model Selection
              </legend>
              <ModelSelect
                id="modelB"
                srLabel="Select model B"
                value={modelBId}
                onValueChange={setModelBId}
                options={availableModels}
              />
              {selectedModelB ? (
                <p className="sr-only">{selectedModelB.variant}</p>
              ) : null}
            </fieldset>
          </BentoCard>

          <BentoCard colSpanClassName="md:col-span-12" className="space-y-4">
            <fieldset
              className="space-y-4 p-0 outline-none focus-within:outline-none [border:0] [margin:0]"
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
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-lg font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#4ff2c2]/70"
                    onClick={() => handleRoundCountChange(totalRounds - 1)}
                    aria-label="Decrease rounds"
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
                    className="w-16 appearance-none bg-transparent text-center text-lg font-semibold text-white outline-none focus:outline-none"
                    aria-label="Round count"
                  />
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-lg font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#4ff2c2]/70"
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
            <div className="flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4">
              <div>
                <p className="text-base font-medium text-white">
                  {summaryLine}
                </p>
                <p className="text-sm text-white/60">{summaryDetails}</p>
              </div>
              <RainbowButton
                type="button"
                disabled={!isConfigurationValid}
                className="w-full uppercase tracking-[0.25em]"
                onClick={handleStartMatch}
              >
                Start Match
              </RainbowButton>
            </div>
            {!isConfigurationValid ? (
              <p className="text-sm font-medium text-amber-300/80">
                Adjust the matchup to start—choose different models and ensure
                round count is between 1 and 100.
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
    </MagicCard>
  )
}
