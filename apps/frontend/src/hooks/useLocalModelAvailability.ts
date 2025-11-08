import { useMemo } from 'react'
import type { ModelId } from '@arena/schema'

import { useBuiltInAI } from '@/integrations/gemini/context'
import type {
  BuiltInAIState,
  ModelDownloadProgress,
} from '@/lib/models/types'

type AvailabilityResult = {
  status: BuiltInAIState
  progress: ModelDownloadProgress | null
  error: Error | null
  startDownload: () => Promise<void>
  retry: () => void
}

export function useLocalModelAvailability(
  modelId: ModelId,
): AvailabilityResult {
  const { modelStates, getModelState, startDownload, retry } = useBuiltInAI()

  const modelState = getModelState(modelId) ?? modelStates[modelId]

  const status: BuiltInAIState = modelState?.status ?? 'checking'
  const progress = modelState?.progress ?? null
  const error = modelState?.error ?? null

  return useMemo(
    () => ({
      status,
      progress,
      error,
      startDownload,
      retry,
    }),
    [status, progress, error, startDownload, retry],
  )
}
