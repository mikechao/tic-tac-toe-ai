import { useMemo } from 'react'

import { MagicCard, ShimmerButton } from '@/components/ui'
import { GeminiProvider, useGeminiContext } from '@/integrations/gemini/context'

interface GeminiSupportGateProps {
  children: React.ReactNode
}

export function GeminiSupportGate({ children }: GeminiSupportGateProps) {
  return (
    <GeminiProvider>
      <GeminiBoundary>{children}</GeminiBoundary>
    </GeminiProvider>
  )
}

function GeminiBoundary({ children }: { children: React.ReactNode }) {
  const { status, progress, error, retry, startDownload } = useGeminiContext()

  const percentProgress = useMemo(() => {
    if (progress == null) return null
    return Math.min(100, Math.max(0, Math.round(progress * 100)))
  }, [progress])

  if (status === 'ready') {
    return <>{children}</>
  }

  if (status === 'checking') {
    return (
      <MagicCard className="border border-white/20 bg-white/5 text-white">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg">Preparing Gemini Nano</h2>
          <p className="text-sm text-white/80">Checking for built-in AI support…</p>
        </div>
      </MagicCard>
    )
  }

  if (status === 'downloading') {
    return (
      <MagicCard className="border border-indigo-400/40 bg-indigo-500/10 text-indigo-100">
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
      </MagicCard>
    )
  }

  if (status === 'downloadable') {
    return (
      <MagicCard className="border border-sky-400/40 bg-sky-500/10 text-sky-100">
        <div className="space-y-3">
          <div>
            <h2 className="font-display text-lg">Download Gemini Nano</h2>
            <p className="text-sm text-sky-100/80">
              Chrome needs to fetch the on-device Gemini Nano model. Click below to start the download.
            </p>
          </div>
          <ShimmerButton type="button" onClick={() => void startDownload()}>
            Download Gemini Nano
          </ShimmerButton>
        </div>
      </MagicCard>
    )
  }

  if (status === 'unsupported') {
    return (
      <MagicCard className="border border-amber-400/40 bg-amber-500/10 text-amber-200">
        <div className="space-y-2">
          <h2 className="font-display text-lg">Built-in AI not supported</h2>
          <p className="text-sm text-amber-100/80">
            This browser doesn&apos;t expose Gemini Nano (built-in AI). Please switch to a compatible Chrome build or use the upcoming server-side option.
          </p>
          <ShimmerButton type="button" onClick={retry}>
            Recheck support
          </ShimmerButton>
        </div>
      </MagicCard>
    )
  }

  return (
    <MagicCard className="border border-rose-400/50 bg-rose-500/10 text-rose-100">
      <div className="space-y-3">
        <div>
          <h2 className="font-display text-lg">Gemini Nano initialization failed</h2>
          <p className="text-sm text-rose-100/80">
            {error instanceof Error
              ? error.message
              : 'An unknown error occurred while preparing Gemini Nano.'}
          </p>
        </div>
        <ShimmerButton type="button" onClick={retry}>
          Try again
        </ShimmerButton>
      </div>
    </MagicCard>
  )
}
