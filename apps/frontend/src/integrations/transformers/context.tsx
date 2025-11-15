import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import * as Sentry from '@sentry/react'
import type { ModelId } from '@arena/schema'

import { localAIModels } from '@/data/models'
import type {
  BuiltInAIState,
  ModelDownloadProgress,
} from '@/lib/models/types'

import {
  checkTransformersAvailability,
  detectTransformersSupport,
  resetTransformersModel,
  startTransformersDownload,
} from './provider'

export type TransformersModelState = {
  status: BuiltInAIState
  progress: ModelDownloadProgress | null
  error: Error | null
}

interface TransformersContextValue {
  modelStates: Record<ModelId, TransformersModelState>
  getModelState: (modelId: ModelId) => TransformersModelState | undefined
  getModelStatus: (modelId: ModelId) => BuiltInAIState
  getModelProgress: (modelId: ModelId) => ModelDownloadProgress | null
  startDownload: (modelId: ModelId) => Promise<void>
  retry: () => void
  primaryModelId: ModelId | null
  mutateModelState: (
    modelId: ModelId,
    updater: (current: TransformersModelState) => TransformersModelState,
  ) => void
  isInferenceActive: boolean
  setInferenceActive: (active: boolean) => void
}

const TransformersJSContext = createContext<TransformersContextValue | undefined>(undefined)

const managedModelIds: ModelId[] = localAIModels
  .filter((model) => model.provider === 'transformers-js')
  .map((model) => model.id)

const primaryModelId: ModelId | null = managedModelIds[0] ?? null

function createInitialStates(): Record<ModelId, TransformersModelState> {
  const initial: Record<ModelId, TransformersModelState> = {}
  managedModelIds.forEach((modelId) => {
    initial[modelId] = {
      status: 'checking',
      progress: null,
      error: null,
    }
  })
  return initial
}

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

type DownloadOutcome = 'success' | 'failure' | 'blocked'

function captureTransformersDownloadTelemetry(
  modelId: ModelId,
  payload: {
    outcome: DownloadOutcome
    durationMs?: number
    attempt: number
    error?: unknown
    reason?: string
  },
): void {
  const meta = localAIModels.find((model) => model.id === modelId)

  Sentry.withScope((scope) => {
    scope.setTag('model.id', String(modelId))
    scope.setTag('model.provider', meta?.provider ?? 'transformers-js')
    scope.setTag('model.vendor', meta?.vendor ?? 'unknown')
    scope.setTag('transformers.download.outcome', payload.outcome)
    if (payload.reason) {
      scope.setTag('transformers.download.reason', payload.reason)
    }
    scope.setExtra('download.attempt', payload.attempt)
    if (payload.durationMs != null) {
      scope.setExtra('download.durationMs', payload.durationMs)
    }
    if (meta?.estimatedDownloadSizeMB != null) {
      scope.setExtra('model.estimatedDownloadSizeMB', meta.estimatedDownloadSizeMB)
    }

    if (payload.outcome === 'success') {
      Sentry.captureMessage('transformers_download_success', 'info')
      return
    }

    const normalizedError =
      payload.error instanceof Error
        ? payload.error
        : new Error(payload.reason ?? 'Transformers download failure')

    if (payload.outcome === 'blocked') {
      Sentry.captureMessage(normalizedError.message, 'warning')
      return
    }

    Sentry.captureException(normalizedError)
  })
}

function ensureState(state?: TransformersModelState): TransformersModelState {
  if (state) {
    return state
  }
  return {
    status: 'checking',
    progress: null,
    error: null,
  }
}

function hasActiveUserGesture(): boolean {
  if (typeof navigator === 'undefined') {
    return true
  }
  const activation = (navigator as Navigator & {
    userActivation?: { isActive: boolean }
  }).userActivation
  if (!activation) {
    return true
  }
  return activation.isActive
}

function now(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

export function TransformersJSProvider({
  children,
}: {
  children: ReactNode
}): JSX.Element {
  const [modelStates, setModelStates] = useState<Record<ModelId, TransformersModelState>>(
    createInitialStates,
  )
  const [isInferenceActive, setInferenceActive] = useState(false)

  const applyToManagedModels = useCallback(
    (
      updater: (
        current: TransformersModelState,
      ) => TransformersModelState,
      abortSignal?: AbortSignal,
    ) => {
      if (abortSignal?.aborted) {
        return
      }
      setModelStates((prev) => {
        const next = { ...prev }
        managedModelIds.forEach((modelId) => {
          next[modelId] = updater(ensureState(prev[modelId]))
        })
        return next
      })
    },
    [],
  )

  const updateModelState = useCallback(
    (
      modelId: ModelId,
      updater: (current: TransformersModelState) => TransformersModelState,
    ) => {
      if (!managedModelIds.includes(modelId)) {
        return
      }
      setModelStates((prev) => ({
        ...prev,
        [modelId]: updater(ensureState(prev[modelId])),
      }))
    },
    [],
  )

  const refreshAvailability = useCallback(
    async (signal?: AbortSignal) => {
      if (!managedModelIds.length) {
        return
      }

      applyToManagedModels(
        (current) => ({
          ...current,
          status: 'checking',
          error: null,
        }),
        signal,
      )

      if (!detectTransformersSupport()) {
        applyToManagedModels(
          (current) => ({
            ...current,
            status: 'not-supported',
            progress: null,
            error: null,
          }),
          signal,
        )
        return
      }

      try {
        const availability = await checkTransformersAvailability()

        applyToManagedModels(
          (current) => ({
            ...current,
            status: availability,
            error: null,
          }),
          signal,
        )
      } catch (error) {
        applyToManagedModels(
          () => ({
            status: 'error',
            progress: null,
            error: error instanceof Error ? error : new Error('Failed to check availability'),
          }),
          signal,
        )
      }
    },
    [applyToManagedModels],
  )

  useEffect(() => {
    const controller = new AbortController()
    void refreshAvailability(controller.signal)
    return () => {
      controller.abort()
    }
  }, [refreshAvailability])

  const startDownload = useCallback(
    async (modelId: ModelId) => {
      if (!managedModelIds.includes(modelId)) {
        return
      }

      if (!hasActiveUserGesture()) {
        const permissionError = new Error('Activate the download with a click or tap.')
        updateModelState(modelId, (current) => ({
          ...current,
          status: 'downloadable',
          progress: null,
          error: permissionError,
        }))
        captureTransformersDownloadTelemetry(modelId, {
          outcome: 'blocked',
          attempt: 0,
          reason: 'user_gesture_required',
          error: permissionError,
        })
        return
      }

      updateModelState(modelId, (current) => ({
        ...current,
        status: 'downloading',
        error: null,
        progress: buildProgress('starting', 0),
      }))

      const startTime = now()
      let attempt = 0
      while (attempt < 2) {
        try {
          attempt += 1
          await startTransformersDownload({
            onProgress: (progress) => {
              updateModelState(modelId, (current) => ({
                ...current,
                status: 'downloading',
                progress,
              }))
            },
          })

          updateModelState(modelId, (current) => ({
            ...current,
            status: 'ready',
            progress: buildProgress('completed', 1),
            error: null,
          }))
          captureTransformersDownloadTelemetry(modelId, {
            outcome: 'success',
            durationMs: now() - startTime,
            attempt,
          })
          return
        } catch (error) {
          await resetTransformersModel()
          if (attempt >= 2) {
            updateModelState(modelId, (current) => ({
              ...current,
              status: 'error',
              progress: buildProgress('failed', 0),
              error:
                error instanceof Error
                  ? error
                  : new Error('Transformers download failed'),
            }))
            captureTransformersDownloadTelemetry(modelId, {
              outcome: 'failure',
              durationMs: now() - startTime,
              attempt,
              error,
              reason:
                error instanceof Error ? error.message : 'Transformers download failed',
            })
            return
          }
          updateModelState(modelId, (current) => ({
            ...current,
            status: 'downloading',
            progress: buildProgress('starting', 0),
            error: null,
          }))
        }
      }
    },
    [updateModelState],
  )

  const retry = useCallback(() => {
    void (async () => {
      await resetTransformersModel()
      await refreshAvailability()
    })()
  }, [refreshAvailability])

  const getModelState = useCallback(
    (modelId: ModelId) => modelStates[modelId],
    [modelStates],
  )

  const getModelStatus = useCallback(
    (modelId: ModelId): BuiltInAIState => modelStates[modelId]?.status ?? 'checking',
    [modelStates],
  )

  const getModelProgress = useCallback(
    (modelId: ModelId): ModelDownloadProgress | null =>
      modelStates[modelId]?.progress ?? null,
    [modelStates],
  )

  const value = useMemo<TransformersContextValue>(
    () => ({
      modelStates,
      getModelState,
      getModelStatus,
      getModelProgress,
      startDownload,
      retry,
      primaryModelId,
      mutateModelState: updateModelState,
      isInferenceActive,
      setInferenceActive,
    }),
    [
      modelStates,
      getModelState,
      getModelStatus,
      getModelProgress,
      startDownload,
      retry,
      updateModelState,
      isInferenceActive,
    ],
  )

  return (
    <TransformersJSContext.Provider value={value}>
      {children}
    </TransformersJSContext.Provider>
  )
}

export function useTransformersJS(): TransformersContextValue {
  const context = useContext(TransformersJSContext)
  if (!context) {
    throw new Error('useTransformersJS must be used within a TransformersJSProvider')
  }
  return context
}
