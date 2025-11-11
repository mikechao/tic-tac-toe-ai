import { createFileRoute } from '@tanstack/react-router'

import { GridBackground } from '@/components/ui/grid-background'
import { RainbowButton } from '@/components/ui'
import { RoundProgressBar } from '@/components/ui/RoundProgressBar'
import { localAIModels } from '@/data/models'
import { useLocalModelAvailability } from '@/hooks/useLocalModelAvailability'
import { BuiltInAIProvider, useBuiltInAI } from '@/integrations/gemini/context'
import { BuiltInAINotSupported } from '@/components/gemini/BuiltInAINotSupported'

export const Route = createFileRoute('/models')({
  component: ModelsRoute,
})

function ModelsRoute() {
  return (
    <BuiltInAIProvider>
      <ModelsPage />
    </BuiltInAIProvider>
  )
}

function ModelsPage() {
  const { modelStates } = useBuiltInAI()
  const readyCount = localAIModels.filter((model) => {
    const state = modelStates[model.id]
    return state?.status === 'ready'
  }).length
  const hasUnsupported = localAIModels.some((model) => {
    const state = modelStates[model.id]
    return state?.status === 'not-supported'
  })

  return (
    <GridBackground className="min-h-screen" gridSize="6:6">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-2 py-8 text-white md:px-4">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-[0.4em] text-emerald-300/80">
                On-Device Gemini
              </span>
              <h1 className="font-display text-3xl md:text-4xl">
                Download local models, play private matches
              </h1>
              <p className="text-sm text-white/80 md:text-base">
                Keep your Tic-Tac-Toe Arena duels fast and private by running Gemini Nano directly
                in your browser. This page confirms hardware support and tracks downloads before you
                queue the next match.
              </p>
            </div>
            <ul className="grid gap-3 text-sm text-white/75 md:w-[320px]">
              <li className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="font-semibold text-white">Low-latency turns</p>
                <p className="mt-1 text-white/70">Moves stream instantly once Gemini Nano is ready.</p>
              </li>
              <li className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="font-semibold text-white">Privacy preserved</p>
                <p className="mt-1 text-white/70">All prompts stay on your device.</p>
              </li>
            </ul>
          </div>
        </header>
        {hasUnsupported ? (
          <BuiltInAINotSupported />
        ) : null}
        <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-white/50">
            Local Models
          </p>
          <div className="mt-4 flex flex-col gap-4">
            {localAIModels.map((model) => (
              <ModelCard key={model.id} modelId={model.id} />
            ))}
          </div>
        </div>
        <aside className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-emerald-50">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">
            Arena readiness
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {readyCount > 0
              ? `${readyCount} model${readyCount === 1 ? '' : 's'} ready for play`
              : 'Finish downloads to unlock on-device matches'}
          </h2>
          <p className="mt-3 text-sm text-emerald-50/80">
            Once a model shows “Ready” above, reopen Match Controls and it will be available for
            low-latency duels. If you switch browsers or Chrome profiles, come back here to recheck
            support and resume downloads.
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-emerald-200">
            Tip
          </p>
          <p className="text-sm text-emerald-50/80">
            Need to restart from scratch? Use the Retry action on any card to clear cached models and
            trigger a fresh availability check before heading back to Arena.
          </p>
        </aside>
      </main>
    </GridBackground>
  )
}

function ModelCard({ modelId }: { modelId: number }) {
  const model = localAIModels.find((entry) => entry.id === modelId)
  const { status, progress, startDownload, retry } = useLocalModelAvailability(modelId)

  if (!model) {
    return null
  }

  if (status === 'not-supported') {
    return null
  }

  const progressPercent = progress?.percent != null ? Math.round(progress.percent) : 0
  const isDownloading = status === 'downloading' || status === 'installing'

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">
            {model.vendor}
          </p>
          <h2 className="text-2xl font-semibold">{model.name}</h2>
          <p className="text-sm text-white/70">{model.variant}</p>
        </div>
        <div className="text-right text-sm text-white/70">
          <p>Provider: {model.provider}</p>
          <button
            type="button"
            className="text-emerald-300 transition hover:text-emerald-200"
            onClick={() => {
              window?.open?.(model.website, '_blank', 'noopener')
            }}
          >
            Docs ↗
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-white/80">
          Status: <span className="font-semibold capitalize">{status}</span>
        </div>
        <RainbowButton
          type="button"
          disabled={status === 'ready' || status === 'downloading'}
          onClick={() => {
            if (status === 'downloadable') {
              void startDownload()
              return
            }
            if (status === 'error') {
              retry()
            }
          }}
        >
          {status === 'ready'
            ? 'Ready'
            : status === 'downloadable'
              ? 'Download'
              : status === 'downloading'
                ? 'Downloading…'
                : 'Retry'}
        </RainbowButton>
      </div>
      {(isDownloading || status === 'downloadable') && (
        <div className="mt-4">
          <RoundProgressBar
            value={progressPercent}
            isIndeterminate={isDownloading && progressPercent === 0}
          />
          {isDownloading && (
            <p className="mt-2 text-sm text-white/60">
              Downloading… {progressPercent}%
            </p>
          )}
        </div>
      )}
    </div>
  )
}
