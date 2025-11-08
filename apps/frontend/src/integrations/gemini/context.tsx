import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ModelId } from '@arena/schema'
import type { BuiltInAIChatLanguageModel } from '@built-in-ai/core'

import { localAIModels } from '@/data/models'
import type {
  BuiltInAIState,
  ModelDownloadProgress,
} from '@/lib/models/types'

import { isBuiltInAISupported } from './capabilities'
import * as Sentry from '@sentry/react'
import {
  ensureGeminiChatModel,
  GeminiInitializationError,
  GeminiPermissionError,
  GeminiUnavailableError,
  getGeminiAvailability,
  resetGeminiModelCache,
  type GeminiAvailability,
} from './model'

type GeminiStatus =
  | 'checking'
  | 'downloadable'
  | 'downloading'
  | 'ready'
  | 'unsupported'
  | 'error'

interface BuiltInAIContextValue {
  status: GeminiStatus
  progress: number | null
  model: BuiltInAIChatLanguageModel | null
  error: Error | null
  retry: () => void
  startDownload: () => Promise<void>
  modelStates: Record<ModelId, GeminiModelState>
  getModelState: (modelId: ModelId) => GeminiModelState | undefined
}

const BuiltInAIContext = createContext<BuiltInAIContextValue | undefined>(undefined)

const managedModelIds: ModelId[] = localAIModels
  .filter((model) => model.provider === 'chrome-builtin')
  .map((model) => model.id)

const defaultModelId: ModelId =
  managedModelIds[0] ?? localAIModels[0]?.id ?? 1
const fallbackManagedIds: ModelId[] = managedModelIds.length
  ? managedModelIds
  : [defaultModelId]

type GeminiModelState = {
  status: BuiltInAIState
  progress: ModelDownloadProgress | null
  error: Error | null
}

function createInitialModelStates(): Record<ModelId, GeminiModelState> {
  const initial: Record<ModelId, GeminiModelState> = {}
  localAIModels.forEach((model) => {
    initial[model.id] = {
      status: model.provider === 'chrome-builtin' ? 'checking' : 'not-supported',
      progress: null,
      error: null,
    }
  })
  return initial
}

function buildProgress(
  phase: ModelDownloadProgress['phase'],
  percent: number,
): ModelDownloadProgress {
  return {
    phase,
    percent,
    receivedBytes: null,
    totalBytes: null,
    lastUpdatedAt: Date.now(),
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

function availabilityToState(
  availability: GeminiAvailability,
): BuiltInAIState {
  switch (availability) {
    case 'available':
    case 'available-after-download':
      return 'ready'
    case 'downloadable':
      return 'downloadable'
    case 'downloading':
      return 'downloading'
    case 'unavailable':
    default:
      return 'not-supported'
  }
}

export function BuiltInAIProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<GeminiStatus>('checking')
  const [progress, setProgress] = useState<number | null>(null)
  const [model, setModel] = useState<BuiltInAIChatLanguageModel | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [modelStates, setModelStates] = useState<Record<ModelId, GeminiModelState>>(
    () => createInitialModelStates(),
  )

  const updateModelStates = useCallback(
    (modelIds: ModelId[], patch: Partial<GeminiModelState>) => {
      if (!modelIds.length) {
        return
      }
      setModelStates((prev) => {
        const next: Record<ModelId, GeminiModelState> = { ...prev }
        modelIds.forEach((modelId) => {
          const previous = next[modelId] ?? {
            status: 'checking',
            progress: null,
            error: null,
          }
          next[modelId] = { ...previous, ...patch }
        })
        return next
      })
    },
    [],
  )

  const resetManagedModelStates = useCallback(() => {
    updateModelStates(fallbackManagedIds, {
      status: 'checking',
      progress: null,
      error: null,
    })
  }, [updateModelStates])

  const applyAvailabilityState = useCallback(
    (availability: GeminiAvailability, progressOverride: number | null = null) => {
      const builtInState = availabilityToState(availability)
      const targetIds = fallbackManagedIds
      const progressPayload =
        builtInState === 'ready'
          ? buildProgress('completed', 1)
          : builtInState === 'downloading'
            ? buildProgress('downloading', progressOverride ?? progress ?? 0)
            : null

      updateModelStates(targetIds, {
        status: builtInState,
        progress: progressPayload,
        error: null,
      })

      if (builtInState === 'ready') {
        setStatus('ready')
        setProgress(1)
      } else if (builtInState === 'downloadable') {
        setStatus('downloadable')
        setProgress(null)
      } else if (builtInState === 'downloading') {
        setStatus('downloading')
      } else if (builtInState === 'not-supported') {
        setStatus('unsupported')
        setProgress(null)
        setModel(null)
      }
    },
    [progress, updateModelStates],
  )

  const captureDownloadError = useCallback(
    async (error: unknown, type: string) => {
      const browserVersion =
        typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      let storageAvailable: number | null = null
      if (
        typeof navigator !== 'undefined' &&
        navigator.storage &&
        typeof navigator.storage.estimate === 'function'
      ) {
        try {
          const estimate = await navigator.storage.estimate()
          if (estimate.quota != null && estimate.usage != null) {
            storageAvailable = estimate.quota - estimate.usage
          }
        } catch (storageError) {
          console.warn('[BuiltInAIProvider] storage estimate failed', storageError)
        }
      }

      const modelMeta = localAIModels.find(
        (model) => model.id === defaultModelId,
      )
      const modelSize = (modelMeta as { size?: number } | undefined)?.size ?? null

      Sentry.withScope((scope) => {
        scope.setTag('error.type', type)
        scope.setTag('model.id', String(defaultModelId))
        scope.setTag('model.provider', modelMeta?.provider ?? 'unknown')
        scope.setTag('browser.version', browserVersion)
        if (storageAvailable != null) {
          scope.setExtra('storage.available', storageAvailable)
        }
        scope.setContext('model', {
          id: defaultModelId,
          provider: modelMeta?.provider ?? 'unknown',
          size: modelSize,
          vendor: modelMeta?.vendor ?? 'Unknown',
        })
        const normalizedError =
          error instanceof Error
            ? error
            : new Error(
                typeof error === 'string'
                  ? error
                  : 'Unknown Gemini download error',
              )
        Sentry.captureException(normalizedError)
      })
    },
    [],
  )

  useEffect(() => {
    console.debug('[BuiltInAIProvider] effect start', { attempt })
    let isMounted = true
    if (!isBuiltInAISupported()) {
      setStatus('unsupported')
      setModel(null)
      setProgress(null)
      setError(null)
      updateModelStates(fallbackManagedIds, {
        status: 'not-supported',
        progress: null,
        error: null,
      })
      return () => {
        console.debug('[BuiltInAIProvider] effect cleanup unsupported', {
          attempt,
        })
      }
    }

    setStatus('checking')
    setProgress(null)
    setError(null)
    resetManagedModelStates()

    getGeminiAvailability()
      .then((availability) => {
        if (!isMounted) {
          return
        }
        applyAvailabilityState(availability)
      })
      .catch((err) => {
        if (!isMounted) {
          return
        }
        console.warn('[BuiltInAIProvider] availability check failed', err)
        void captureDownloadError(err, 'availability_check_failed')
      })

    ensureGeminiChatModel({
      onDownloadProgress: (progressValue) => {
        if (!isMounted) return
        setStatus('downloading')
        setProgress(progressValue)
        updateModelStates(fallbackManagedIds, {
          status: 'downloading',
          progress: buildProgress('downloading', progressValue),
        })
      },
    })
      .then((loadedModel) => {
        if (!isMounted) return
        console.debug('[BuiltInAIProvider] model initialized')
        setModel(loadedModel)
        setStatus('ready')
        setProgress(1)
        updateModelStates(fallbackManagedIds, {
          status: 'ready',
          progress: buildProgress('completed', 1),
          error: null,
        })
        void getGeminiAvailability().then((availability) => {
          if (!isMounted) return
          applyAvailabilityState(availability)
        })
      })
      .catch((err) => {
        if (!isMounted) return
        if (err instanceof GeminiPermissionError) {
          console.debug('[BuiltInAIProvider] download requires user gesture')
          setStatus('downloadable')
          setProgress(null)
          setError(null)
          updateModelStates(fallbackManagedIds, {
            status: 'downloadable',
            progress: null,
            error: null,
          })
          void captureDownloadError(err, 'permission_required')
          return
        }
        if (err instanceof GeminiUnavailableError) {
          console.warn('[BuiltInAIProvider] unsupported environment', err)
          setStatus('unsupported')
          setModel(null)
          setProgress(null)
          setError(err)
          updateModelStates(fallbackManagedIds, {
            status: 'not-supported',
            progress: null,
            error: err,
          })
          void captureDownloadError(err, 'unsupported_hardware')
          return
        }
        if (err instanceof GeminiInitializationError) {
          console.error('[BuiltInAIProvider] initialization failed', err)
          setStatus('error')
          setError(err)
          updateModelStates(fallbackManagedIds, {
            status: 'error',
            error: err,
          })
          void captureDownloadError(err, 'download_failed')
          return
        }
        console.error('[BuiltInAIProvider] unexpected error', err)
        setStatus('error')
        setError(err as Error)
        updateModelStates(fallbackManagedIds, {
          status: 'error',
          error: err as Error,
        })
        void captureDownloadError(err, 'unexpected')
      })

    return () => {
      console.debug('[BuiltInAIProvider] effect cleanup', { attempt })
      isMounted = false
    }
  }, [attempt, applyAvailabilityState, captureDownloadError])

  const retry = useCallback(() => {
    resetGeminiModelCache()
    resetManagedModelStates()
    setAttempt((value) => value + 1)
  }, [resetManagedModelStates])

  const startDownload = useCallback(async () => {
    if (status === 'downloading' || status === 'ready') {
      return
    }

    if (!hasActiveUserGesture()) {
      console.debug('[BuiltInAIProvider] user gesture required before download')
      const permissionError = new GeminiPermissionError(
        'Activate the download with a click or tap.',
      )
      setStatus('downloadable')
      setProgress(null)
      setError(permissionError)
      updateModelStates(fallbackManagedIds, {
        status: 'downloadable',
        progress: null,
        error: permissionError,
      })
      return
    }

    console.debug('[BuiltInAIProvider] manual download start')
    setStatus('downloading')
    setProgress(0)
    setError(null)
    updateModelStates(fallbackManagedIds, {
      status: 'downloading',
      progress: buildProgress('starting', 0),
      error: null,
    })

    resetGeminiModelCache()

    try {
      const loadedModel = await ensureGeminiChatModel({
        onDownloadProgress: (progressValue) => {
          setProgress(progressValue)
          updateModelStates(fallbackManagedIds, {
            status: 'downloading',
            progress: buildProgress('downloading', progressValue),
          })
        },
      })
      console.debug('[BuiltInAIProvider] manual download complete')
      setModel(loadedModel)
      setStatus('ready')
      setProgress(1)
      updateModelStates(fallbackManagedIds, {
        status: 'ready',
        progress: buildProgress('completed', 1),
        error: null,
      })
      void getGeminiAvailability().then((availability) => {
        applyAvailabilityState(availability)
      })
    } catch (err) {
      if (err instanceof GeminiPermissionError) {
        console.debug('[BuiltInAIProvider] user gesture still required')
        setStatus('downloadable')
        setProgress(null)
        setError(null)
        updateModelStates(fallbackManagedIds, {
          status: 'downloadable',
          progress: null,
          error: null,
        })
        void captureDownloadError(err, 'permission_required')
        return
      }
      if (err instanceof GeminiUnavailableError) {
        console.warn('[BuiltInAIProvider] unsupported during manual download', err)
        setStatus('unsupported')
        setModel(null)
        setProgress(null)
        setError(err)
        updateModelStates(fallbackManagedIds, {
          status: 'not-supported',
          progress: null,
          error: err,
        })
        void captureDownloadError(err, 'unsupported_hardware')
        return
      }
      if (err instanceof GeminiInitializationError) {
        console.error('[BuiltInAIProvider] download failed', err)
        setStatus('error')
        setError(err)
        updateModelStates(fallbackManagedIds, {
          status: 'error',
          error: err,
        })
        void captureDownloadError(err, 'download_failed')
        return
      }
      console.error('[BuiltInAIProvider] unexpected download error', err)
      setStatus('error')
      setError(err as Error)
      updateModelStates(fallbackManagedIds, {
        status: 'error',
        error: err as Error,
      })
      void captureDownloadError(err, 'unexpected')
    }
  }, [status, updateModelStates, applyAvailabilityState, captureDownloadError])

  const getModelState = useCallback(
    (modelId: ModelId): GeminiModelState | undefined => modelStates[modelId],
    [modelStates],
  )

  const contextValue = useMemo<BuiltInAIContextValue>(
    () => ({
      status,
      progress,
      model,
      error,
      retry,
      startDownload,
      modelStates,
      getModelState,
    }),
    [status, progress, model, error, retry, startDownload, modelStates, getModelState],
  )

  return (
    <BuiltInAIContext.Provider value={contextValue}>
      {children}
    </BuiltInAIContext.Provider>
  )
}

export function useBuiltInAI(): BuiltInAIContextValue {
  const context = useContext(BuiltInAIContext)
  if (!context) {
    throw new Error('useBuiltInAI must be used within a BuiltInAIProvider')
  }
  return context
}

export function useBuiltInAIModel(): BuiltInAIChatLanguageModel | null {
  const { model } = useBuiltInAI()
  return model
}
