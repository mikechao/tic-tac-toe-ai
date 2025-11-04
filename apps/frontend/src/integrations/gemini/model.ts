import { builtInAI, type BuiltInAIChatLanguageModel } from '@built-in-ai/core'

import { isBuiltInAISupported } from './capabilities'

export class GeminiUnavailableError extends Error {
  constructor(message = 'Gemini Nano is not available in this runtime.') {
    super(message)
    this.name = 'GeminiUnavailableError'
  }
}

export class GeminiInitializationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'GeminiInitializationError'
    if (options?.cause) {
      // Preserve original error in environments that support Error.cause
      ;(this as Error & { cause?: unknown }).cause = options.cause
    }
  }
}

export interface GeminiModelInitOptions {
  /**
   * Callback that receives download progress in the range [0, 1].
   */
  onDownloadProgress?: (progress: number) => void
  /**
   * Optional abort signal so callers can cancel initialization work.
   */
  signal?: AbortSignal
}

type GeminiAvailability = 'unavailable' | 'available' | 'available-after-download' | 'downloadable' | 'downloading'

let cachedModel: BuiltInAIChatLanguageModel | null = null
let pendingInitialization: Promise<BuiltInAIChatLanguageModel> | null = null

export function resetGeminiModelCache(): void {
  cachedModel = null
  pendingInitialization = null
}

function createAbortError(message: string): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(message, 'AbortError')
  }
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

function ensureClientEnvironment(): void {
  if (typeof window === 'undefined') {
    throw new GeminiUnavailableError(
      'Gemini Nano runs only in supported browsers. Detected non-browser runtime.'
    )
  }
}

function isDownloadRequired(status: GeminiAvailability): boolean {
  return status !== 'available' && status !== 'unavailable'
}

async function initializeModel(options?: GeminiModelInitOptions): Promise<BuiltInAIChatLanguageModel> {
  ensureClientEnvironment()

  if (options?.signal?.aborted) {
    throw createAbortError('Initialization aborted')
  }

  if (!isBuiltInAISupported()) {
    throw new GeminiUnavailableError('This browser does not expose the built-in AI Prompt API.')
  }

  const model = builtInAI()

  let availability: GeminiAvailability
  try {
    availability = (await model.availability()) as GeminiAvailability
  } catch (error) {
    throw new GeminiInitializationError('Failed to determine Gemini Nano availability.', {
      cause: error,
    })
  }

  if (availability === 'unavailable') {
    throw new GeminiUnavailableError(
      'Gemini Nano is unavailable. Ensure the Prompt API flag is enabled and the model is downloaded.'
    )
  }

  const needsDownload = isDownloadRequired(availability)

  if (needsDownload || !cachedModel) {
    try {
      await model.createSessionWithProgress(progress => {
        options?.onDownloadProgress?.(progress)
        if (options?.signal?.aborted) {
          throw createAbortError('Initialization aborted')
        }
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error
      }
      throw new GeminiInitializationError('Gemini Nano session bootstrap failed.', {
        cause: error,
      })
    }
  }

  return model
}

export async function ensureGeminiChatModel(
  options?: GeminiModelInitOptions
): Promise<BuiltInAIChatLanguageModel> {
  if (cachedModel) {
    return cachedModel
  }

  if (!pendingInitialization) {
    pendingInitialization = initializeModel(options)
      .then(model => {
        cachedModel = model
        return model
      })
      .finally(() => {
        pendingInitialization = null
      })
  }

  return pendingInitialization
}

export async function getGeminiAvailability(): Promise<GeminiAvailability> {
  ensureClientEnvironment()

  if (!isBuiltInAISupported()) {
    return 'unavailable'
  }

  const model = builtInAI()
  const availability = (await model.availability()) as GeminiAvailability
  return availability
}
