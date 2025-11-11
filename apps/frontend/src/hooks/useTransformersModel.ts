import { useCallback, useMemo, useRef } from 'react'
import type { ModelId } from '@arena/schema'

import { useTransformersJS } from '@/integrations/transformers/context'
import {
  TRANSFORMERS_MODEL_ID,
  checkTransformersAvailability,
  createTransformersModel,
  detectTransformersSupport,
  resetTransformersModel,
} from '@/integrations/transformers/provider'
import type { ModelDownloadProgress } from '@/lib/models/types'

function buildProgress(
  phase: ModelDownloadProgress['phase'],
  fraction: number,
): ModelDownloadProgress {
  const percent = Math.min(100, Math.max(0, Math.round((fraction ?? 0) * 100)))
  return {
    phase,
    percent,
    receivedBytes: null,
    totalBytes: null,
    lastUpdatedAt: Date.now(),
  }
}

export function useTransformersModel(modelId: ModelId = TRANSFORMERS_MODEL_ID) {
  const { mutateModelState, isInferenceActive, setInferenceActive } = useTransformersJS()
  const modelRef = useRef<ReturnType<typeof createTransformersModel> | null>(null)

  const emitProgress = useCallback(
    (phase: ModelDownloadProgress['phase'], fraction: number) => {
      const nextProgress = buildProgress(phase, fraction)
      mutateModelState(modelId, (current) => ({
        ...current,
        status: phase === 'completed' ? 'ready' : 'downloading',
        progress: nextProgress,
        error: null,
      }))
    },
    [modelId, mutateModelState],
  )

  const ensureModel = useCallback(() => {
    if (modelRef.current) {
      return modelRef.current
    }
    if (!detectTransformersSupport()) {
      throw new Error('Transformers.js is not supported in this browser')
    }
    modelRef.current = createTransformersModel({
      initProgressCallback: ({ progress }) => {
        emitProgress('downloading', progress ?? 0)
      },
    })
    return modelRef.current
  }, [emitProgress])

  const checkAvailability = useCallback(async () => {
    return checkTransformersAvailability()
  }, [])

  const createSessionWithProgress = useCallback(async () => {
    const model = ensureModel()
    emitProgress('starting', 0)
    await model.createSessionWithProgress(({ progress }) => {
      emitProgress('downloading', progress ?? 0)
    })
    emitProgress('completed', 1)
  }, [emitProgress, ensureModel])

  const reset = useCallback(async () => {
    modelRef.current = null
    await resetTransformersModel()
  }, [])

  const value = useMemo(
    () => ({
      model: modelRef.current,
      isSupported: detectTransformersSupport(),
      ensureModel,
      checkAvailability,
      createSessionWithProgress,
      reset,
      isInferenceActive,
      setInferenceActive,
    }),
    [
      checkAvailability,
      createSessionWithProgress,
      ensureModel,
      reset,
      isInferenceActive,
      setInferenceActive,
    ],
  )

  return value
}
