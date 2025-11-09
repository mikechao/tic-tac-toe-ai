import { useMemo } from 'react'
import type { ModelId } from '@arena/schema'

import { useBuiltInAI } from '@/integrations/gemini/context'
import type {
  BuiltInAIState,
  ModelDownloadProgress,
} from '@/lib/models/types'
import { getProviderForModel } from '@/lib/models/providers'

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
  const { modelStates, getModelState, retry, model, startDownload } = useBuiltInAI()

  const modelState = getModelState(modelId) ?? modelStates[modelId]

  const status: BuiltInAIState = modelState?.status ?? 'checking'
  const progress = modelState?.progress ?? null
  const error = modelState?.error ?? null

  return useMemo(
    () => ({
      status,
      progress,
      error,
      startDownload: async () => {
        const provider = getProviderForModel(modelId)
        if (!provider) {
          throw new Error(`No provider registered for model ${modelId}`)
        }
        await provider.startDownload()
      },
      retry,
    }),
    [status, progress, error, modelId, retry, startDownload],
  )
}
