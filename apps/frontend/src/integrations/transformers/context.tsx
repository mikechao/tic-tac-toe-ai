import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
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
  const percent = Math.min(100, Math.max(0, Math.round(fraction * 100)))
  return {
    phase,
    percent,
    receivedBytes: null,
    totalBytes: null,
    lastUpdatedAt: Date.now(),
  }
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

export function TransformersJSProvider({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  const [modelStates, setModelStates] = useState<Record<ModelId, TransformersModelState>>(
    createInitialStates,
  )

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
    [managedModelIds],
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
    [managedModelIds],
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
        return
      }

      updateModelState(modelId, (current) => ({
        ...current,
        status: 'downloading',
        error: null,
        progress: buildProgress('starting', 0),
      }))

      let attempt = 0
      while (attempt < 2) {
        try {
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
          return
        } catch (error) {
          attempt += 1
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
    [managedModelIds, updateModelState],
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
    }),
    [
      modelStates,
      getModelState,
      getModelStatus,
      getModelProgress,
      startDownload,
      retry,
      updateModelState,
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
