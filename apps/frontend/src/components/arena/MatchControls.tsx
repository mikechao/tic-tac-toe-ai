import { useEffect, useMemo, useState } from 'react'

import type { ModelId } from '@arena/schema'

import { demoModels } from '@/data/demo.models'
import { cn } from '@/lib/utils'
import {
  BentoCard,
  BentoGrid,
  BlurFade,
  MagicCard,
  RainbowButton,
} from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGeminiContext } from '@/integrations/gemini/context'

type RoundPreset = 'single' | 'bestOf3' | 'bestOf5' | 'custom'

type ModelOption = (typeof demoModels)[number]

const roundPresetOptions: Array<{
  value: RoundPreset
  label: string
  helper: string
  rounds: number | null
}> = [
  { value: 'single', label: 'Single', helper: 'Winner takes all', rounds: 1 },
  {
    value: 'bestOf3',
    label: 'Best of 3',
    helper: 'First to two wins',
    rounds: 3,
  },
  {
    value: 'bestOf5',
    label: 'Best of 5',
    helper: 'Series of five rounds',
    rounds: 5,
  },
  {
    value: 'custom',
    label: 'Custom',
    helper: 'Set a custom round count',
    rounds: null,
  },
]

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
        onValueChange={(nextValue) => onValueChange(Number(nextValue) as ModelId)}
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

  const availableModels = useMemo(
    () => demoModels.filter((model) => model.name === 'Gemini Nano'),
    [],
  )
  const defaultModelId = availableModels[0]?.id ?? 1

  const [modelAId, setModelAId] = useState<ModelId>(defaultModelId)
  const [modelBId, setModelBId] = useState<ModelId>(defaultModelId)
  const [roundPreset, setRoundPreset] = useState<RoundPreset>('bestOf5')
  const [customRounds, setCustomRounds] = useState<number>(7)
  const [roundAnnouncement, setRoundAnnouncement] = useState<string>(
    'Rounds set to Best of 5',
  )

  const isCustomRoundsActive = roundPreset === 'custom'
  const totalRounds = isCustomRoundsActive
    ? clamp(Number.isFinite(customRounds) ? customRounds : 1, 1, 100)
    : (roundPresetOptions.find((option) => option.value === roundPreset)
        ?.rounds ?? 1)

  useEffect(() => {
    const presetLabel =
      roundPresetOptions.find((option) => option.value === roundPreset)
        ?.label ?? 'Custom'
    const message =
      roundPreset === 'custom'
        ? `Rounds set to Custom ${totalRounds}`
        : `Rounds set to ${presetLabel}`
    setRoundAnnouncement(message)
  }, [roundPreset, totalRounds])

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

  const handleCustomRoundsChange = (value: number) => {
    setCustomRounds(clamp(Math.round(value || 1), 1, 100))
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
          <BentoCard colSpanClassName="md:col-span-6">
            <fieldset className="space-y-3">
              <legend className="flex items-center justify-between text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                Player 1
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

          <BentoCard colSpanClassName="md:col-span-6">
            <fieldset className="space-y-3">
              <legend className="flex items-center justify-between text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                Player 2
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
              <div className="grid gap-3">
                {roundPresetOptions.map((option) => {
                  const isActive = option.value === roundPreset
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        'relative flex h-full cursor-pointer flex-col rounded-[1.5rem] border border-white/15 bg-white/5 px-5 py-4 transition focus-within:ring-2 focus-within:ring-[#f15bb5]/60 focus-within:ring-offset-2 focus-within:ring-offset-transparent',
                        isActive
                          ? 'border-[#f15bb5] bg-[#f15bb5]/12 shadow-[0_16px_44px_rgba(241,91,181,0.35)]'
                          : 'hover:border-white/25',
                      )}
                    >
                      <input
                        type="radio"
                        name="roundPreset"
                        value={option.value}
                        checked={isActive}
                        onChange={() => setRoundPreset(option.value)}
                        className="sr-only"
                      />
                      <span className="text-sm font-semibold uppercase tracking-[0.15em]">
                        {option.label}
                      </span>
                      <span className="mt-1 text-xs text-white/60">
                        {option.helper}
                      </span>
                    </label>
                  )
                })}
              </div>
              {isCustomRoundsActive && (
                <BlurFade duration={0.3} blur="4px">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                      Custom rounds
                    </p>
                    <div className="mt-3 flex items-center gap-3 rounded-full bg-white/5 px-3 py-2">
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-lg font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#4ff2c2]/70"
                        onClick={() => handleCustomRoundsChange(customRounds - 1)}
                        disabled={!isCustomRoundsActive}
                        aria-label="Decrease rounds"
                      >
                        –
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={100}
                        value={customRounds}
                        onChange={(event) =>
                          handleCustomRoundsChange(Number(event.target.value))
                        }
                        className="w-16 appearance-none bg-transparent text-center text-lg font-semibold text-white outline-none focus:outline-none disabled:opacity-60"
                        disabled={!isCustomRoundsActive}
                        aria-label="Custom round count"
                      />
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-lg font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#4ff2c2]/70"
                        onClick={() => handleCustomRoundsChange(customRounds + 1)}
                        disabled={!isCustomRoundsActive}
                        aria-label="Increase rounds"
                      >
                        +
                      </button>
                      <span className="ml-auto text-xs uppercase tracking-[0.2em] text-white/40">
                        1–100
                      </span>
                    </div>
                  </div>
                </BlurFade>
              )}
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
