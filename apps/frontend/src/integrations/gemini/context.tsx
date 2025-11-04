import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { BuiltInAIChatLanguageModel } from '@built-in-ai/core'

import { isBuiltInAISupported } from './capabilities'
import {
  ensureGeminiChatModel,
  GeminiInitializationError,
  GeminiUnavailableError,
  resetGeminiModelCache,
} from './model'

type GeminiStatus = 'checking' | 'downloading' | 'ready' | 'unsupported' | 'error'

interface GeminiContextValue {
  status: GeminiStatus
  progress: number | null
  model: BuiltInAIChatLanguageModel | null
  error: Error | null
  retry: () => void
}

const GeminiContext = createContext<GeminiContextValue | undefined>(undefined)

export function GeminiProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<GeminiStatus>('checking')
  const [progress, setProgress] = useState<number | null>(null)
  const [model, setModel] = useState<BuiltInAIChatLanguageModel | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    console.debug('[GeminiProvider] effect start', { attempt })
    let isMounted = true

    if (!isBuiltInAISupported()) {
      setStatus('unsupported')
      setModel(null)
      setProgress(null)
      setError(null)
      return () => {
        console.debug('[GeminiProvider] effect cleanup unsupported', { attempt })
      }
    }

    setStatus('checking')
    setProgress(null)
    setError(null)

    ensureGeminiChatModel({
      onDownloadProgress: progressValue => {
        if (!isMounted) return
        setStatus('downloading')
        setProgress(progressValue)
      },
    })
      .then(loadedModel => {
        if (!isMounted) return
        console.debug('[GeminiProvider] model initialized')
        setModel(loadedModel)
        setStatus('ready')
        setProgress(1)
      })
      .catch(err => {
        if (!isMounted) return
        if (err instanceof GeminiUnavailableError) {
          console.warn('[GeminiProvider] unsupported environment', err)
          setStatus('unsupported')
          setModel(null)
          setProgress(null)
          setError(err)
          return
        }
        if (err instanceof GeminiInitializationError) {
          console.error('[GeminiProvider] initialization failed', err)
          setStatus('error')
          setError(err)
          return
        }
        console.error('[GeminiProvider] unexpected error', err)
        setStatus('error')
        setError(err as Error)
      })

    return () => {
      console.debug('[GeminiProvider] effect cleanup', { attempt })
      isMounted = false
    }
  }, [attempt])

  const retry = useCallback(() => {
    resetGeminiModelCache()
    setAttempt(value => value + 1)
  }, [])

  const contextValue = useMemo<GeminiContextValue>(
    () => ({
      status,
      progress,
      model,
      error,
      retry,
    }),
    [status, progress, model, error, retry]
  )

  return <GeminiContext.Provider value={contextValue}>{children}</GeminiContext.Provider>
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
