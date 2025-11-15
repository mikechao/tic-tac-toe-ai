import { useMemo } from 'react'
import type { ModelId } from '@arena/schema'

import { localAIModels } from '@arena/schema/models'
import { useBuiltInAI } from '@/integrations/gemini/context'
import { useTransformersJS } from '@/integrations/transformers/context'
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
  const { modelStates, getModelState, retry, startDownload } = useBuiltInAI()
  const transformers = useTransformersJS()
  const modelMeta = localAIModels.find((entry) => entry.id === modelId)
  const providerId = modelMeta?.provider ?? 'chrome-builtin'

  const modelState = getModelState(modelId) ?? modelStates[modelId]

  const status: BuiltInAIState =
    providerId === 'transformers-js'
      ? transformers.getModelStatus(modelId)
      : modelState?.status ?? 'checking'

  const progress: ModelDownloadProgress | null =
    providerId === 'transformers-js'
      ? transformers.getModelProgress(modelId)
      : modelState?.progress ?? null

  const error: Error | null =
    providerId === 'transformers-js'
      ? transformers.getModelState(modelId)?.error ?? null
      : modelState?.error ?? null

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
        if (provider.id === 'chrome-builtin') {
          await startDownload()
          return
        }
        if (provider.id === 'transformers-js') {
          await transformers.startDownload(modelId)
          return
        }
        await provider.startDownload()
      },
      retry: () => {
        if (providerId === 'transformers-js') {
          transformers.retry()
          return
        }
        retry()
      },
    }),
    [
      status,
      progress,
      error,
      modelId,
      providerId,
      retry,
      startDownload,
      transformers,
    ],
  )
}
