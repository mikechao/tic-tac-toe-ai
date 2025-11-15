import { useMemo } from 'react'

import { localAIModels } from '@arena/schema/models'
import { useLocalModelAvailability } from '@/hooks/useLocalModelAvailability'
import { MyMagicCard, RainbowButton } from '@/components/ui'
import { BuiltInAIProvider } from '@/integrations/gemini/context'
import { BuiltInAINotSupported } from '@/components/gemini/BuiltInAINotSupported'

interface GeminiSupportGateProps {
  children: React.ReactNode
}

export function GeminiSupportGate({ children }: GeminiSupportGateProps) {
  return (
    <BuiltInAIProvider>
      <GeminiBoundary>{children}</GeminiBoundary>
    </BuiltInAIProvider>
  )
}

const defaultModelId =
  localAIModels.find((model) => model.provider === 'chrome-builtin')?.id ??
  localAIModels[0]?.id ??
  1

function GeminiBoundary({ children }: { children: React.ReactNode }) {
  const { status, progress, error, retry, startDownload } =
    useLocalModelAvailability(defaultModelId)

  const percentProgress = useMemo(() => {
    const percent = progress?.percent
    if (percent == null) return null
    return Math.min(100, Math.max(0, Math.round(percent)))
  }, [progress])

  if (status === 'ready') {
    return <>{children}</>
  }

  if (status === 'checking') {
    return (
      <MyMagicCard className="border border-white/20 bg-white/5 text-white">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg">Preparing Gemini Nano</h2>
          <p className="text-sm text-white/80">
            Checking for built-in AI support…
          </p>
        </div>
      </MyMagicCard>
    )
  }

  if (status === 'downloading' || status === 'installing') {
    return (
      <MyMagicCard className="border border-indigo-400/40 bg-indigo-500/10 text-indigo-100">
        <div className="space-y-3">
          <div>
            <h2 className="font-display text-lg">Fetching on-device model</h2>
            <p className="text-sm text-indigo-100/80">
              {percentProgress != null
                ? `Download in progress… ${percentProgress}%`
                : 'Download in progress…'}
            </p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100/20">
            <div
              className="h-full rounded-full bg-indigo-300 transition-all"
              style={{ width: `${percentProgress ?? 10}%` }}
            />
          </div>
        </div>
      </MyMagicCard>
    )
  }

  if (status === 'downloadable') {
    return (
      <MyMagicCard className="border border-sky-400/40 bg-sky-500/10 text-sky-100">
        <div className="space-y-3">
          <div>
            <h2 className="font-display text-lg">Download Gemini Nano</h2>
            <p className="text-sm text-sky-100/80">
              Chrome needs to fetch the on-device Gemini Nano model. Click below
              to start the download.
            </p>
          </div>
          <RainbowButton
            type="button"
            className="uppercase tracking-[0.2em]"
            onClick={() => void startDownload()}
          >
            Download Gemini Nano
          </RainbowButton>
        </div>
      </MyMagicCard>
    )
  }

  if (status === 'not-supported') {
    return <BuiltInAINotSupported onRetry={retry} />
  }

  return (
    <MyMagicCard className="border border-rose-400/50 bg-rose-500/10 text-rose-100">
      <div className="space-y-3">
        <div>
          <h2 className="font-display text-lg">
            Gemini Nano initialization failed
          </h2>
          <p className="text-sm text-rose-100/80">
            {error instanceof Error
              ? error.message
              : 'An unknown error occurred while preparing Gemini Nano.'}
          </p>
        </div>
        <RainbowButton
          type="button"
          className="uppercase tracking-[0.2em]"
          onClick={retry}
        >
          Try again
        </RainbowButton>
      </div>
    </MyMagicCard>
  )
}
