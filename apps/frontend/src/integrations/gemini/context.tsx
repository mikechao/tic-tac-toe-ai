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
import {
  ensureGeminiChatModel,
  GeminiInitializationError,
  GeminiPermissionError,
  GeminiUnavailableError,
  resetGeminiModelCache,
} from './model'

type GeminiStatus =
  | 'checking'
  | 'downloadable'
  | 'downloading'
  | 'ready'
  | 'unsupported'
  | 'error'

interface GeminiContextValue {
  status: GeminiStatus
  progress: number | null
  model: BuiltInAIChatLanguageModel | null
  error: Error | null
  retry: () => void
  startDownload: () => Promise<void>
  modelStates: Record<ModelId, GeminiModelState>
  getModelState: (modelId: ModelId) => GeminiModelState | undefined
}

const GeminiContext = createContext<GeminiContextValue | undefined>(undefined)

const managedModelIds: ModelId[] = localAIModels
  .filter((model) => model.provider === 'chrome-builtin')
  .map((model) => model.id)

const defaultModelId: ModelId =
  managedModelIds[0] ?? localAIModels[0]?.id ?? 1

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

export function GeminiProvider({ children }: { children: React.ReactNode }) {
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
    updateModelStates(managedModelIds, {
      status: 'checking',
      progress: null,
      error: null,
    })
  }, [updateModelStates])

  useEffect(() => {
    console.debug('[GeminiProvider] effect start', { attempt })
    let isMounted = true

    if (!isBuiltInAISupported()) {
      setStatus('unsupported')
      setModel(null)
      setProgress(null)
      setError(null)
      updateModelStates(managedModelIds, {
        status: 'not-supported',
        progress: null,
        error: null,
      })
      return () => {
        console.debug('[GeminiProvider] effect cleanup unsupported', {
          attempt,
        })
      }
    }

    setStatus('checking')
    setProgress(null)
    setError(null)
    resetManagedModelStates()

    ensureGeminiChatModel({
      onDownloadProgress: (progressValue) => {
        if (!isMounted) return
        setStatus('downloading')
        setProgress(progressValue)
        updateModelStates(managedModelIds, {
          status: 'downloading',
          progress: buildProgress('downloading', progressValue),
        })
      },
    })
      .then((loadedModel) => {
        if (!isMounted) return
        console.debug('[GeminiProvider] model initialized')
        setModel(loadedModel)
        setStatus('ready')
        setProgress(1)
        updateModelStates(managedModelIds, {
          status: 'ready',
          progress: buildProgress('completed', 1),
          error: null,
        })
      })
      .catch((err) => {
        if (!isMounted) return
        if (err instanceof GeminiPermissionError) {
          console.debug('[GeminiProvider] download requires user gesture')
          setStatus('downloadable')
          setProgress(null)
          setError(null)
          updateModelStates(managedModelIds, {
            status: 'downloadable',
            progress: null,
            error: null,
          })
          return
        }
        if (err instanceof GeminiUnavailableError) {
          console.warn('[GeminiProvider] unsupported environment', err)
          setStatus('unsupported')
          setModel(null)
          setProgress(null)
          setError(err)
          updateModelStates(managedModelIds, {
            status: 'not-supported',
            progress: null,
            error: err,
          })
          return
        }
        if (err instanceof GeminiInitializationError) {
          console.error('[GeminiProvider] initialization failed', err)
          setStatus('error')
          setError(err)
          updateModelStates(managedModelIds, {
            status: 'error',
            error: err,
          })
          return
        }
        console.error('[GeminiProvider] unexpected error', err)
        setStatus('error')
        setError(err as Error)
        updateModelStates(managedModelIds, {
          status: 'error',
          error: err as Error,
        })
      })

    return () => {
      console.debug('[GeminiProvider] effect cleanup', { attempt })
      isMounted = false
    }
  }, [attempt])

  const retry = useCallback(() => {
    resetGeminiModelCache()
    resetManagedModelStates()
    setAttempt((value) => value + 1)
  }, [resetManagedModelStates])

  const startDownload = useCallback(async () => {
    if (status === 'downloading' || status === 'ready') {
      return
    }

    console.debug('[GeminiProvider] manual download start')
    setStatus('downloading')
    setProgress(0)
    setError(null)
    updateModelStates(managedModelIds, {
      status: 'downloading',
      progress: buildProgress('starting', 0),
      error: null,
    })

    resetGeminiModelCache()

    try {
      const loadedModel = await ensureGeminiChatModel({
        onDownloadProgress: (progressValue) => {
          setProgress(progressValue)
          updateModelStates(managedModelIds, {
            status: 'downloading',
            progress: buildProgress('downloading', progressValue),
          })
        },
      })
      console.debug('[GeminiProvider] manual download complete')
      setModel(loadedModel)
      setStatus('ready')
      setProgress(1)
      updateModelStates(managedModelIds, {
        status: 'ready',
        progress: buildProgress('completed', 1),
        error: null,
      })
    } catch (err) {
      if (err instanceof GeminiPermissionError) {
        console.debug('[GeminiProvider] user gesture still required')
        setStatus('downloadable')
        setProgress(null)
        setError(null)
        updateModelStates(managedModelIds, {
          status: 'downloadable',
          progress: null,
          error: null,
        })
        return
      }
      if (err instanceof GeminiUnavailableError) {
        console.warn('[GeminiProvider] unsupported during manual download', err)
        setStatus('unsupported')
        setModel(null)
        setProgress(null)
        setError(err)
        updateModelStates(managedModelIds, {
          status: 'not-supported',
          progress: null,
          error: err,
        })
        return
      }
      if (err instanceof GeminiInitializationError) {
        console.error('[GeminiProvider] download failed', err)
        setStatus('error')
        setError(err)
        updateModelStates(managedModelIds, {
          status: 'error',
          error: err,
        })
        return
      }
      console.error('[GeminiProvider] unexpected download error', err)
      setStatus('error')
      setError(err as Error)
      updateModelStates(managedModelIds, {
        status: 'error',
        error: err as Error,
      })
    }
  }, [status, updateModelStates])

  const getModelState = useCallback(
    (modelId: ModelId): GeminiModelState | undefined => modelStates[modelId],
    [modelStates],
  )

  const contextValue = useMemo<GeminiContextValue>(
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
    <GeminiContext.Provider value={contextValue}>
      {children}
    </GeminiContext.Provider>
  )
}

export function useGeminiContext(): GeminiContextValue {
  const context = useContext(GeminiContext)
  if (!context) {
    throw new Error('useGeminiContext must be used within a GeminiProvider')
  }
  return context
}

export function useGeminiModel(): BuiltInAIChatLanguageModel | null {
  const { model } = useGeminiContext()
  return model
}
