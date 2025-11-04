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

export class GeminiPermissionError extends Error {
  constructor(message = 'Gemini Nano download requires a user interaction.') {
    super(message)
    this.name = 'GeminiPermissionError'
  }
}

export interface GeminiModelInitOptions {
  /**
   * Callback that receives download progress in the range [0, 1].
   */
  onDownloadProgress?: (progress: number) => void
}

type GeminiAvailability = 'unavailable' | 'available' | 'available-after-download' | 'downloadable' | 'downloading'

let cachedModel: BuiltInAIChatLanguageModel | null = null
let pendingInitialization: Promise<BuiltInAIChatLanguageModel> | null = null

export function resetGeminiModelCache(): void {
  cachedModel = null
  pendingInitialization = null
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

  if (!isBuiltInAISupported()) {
    throw new GeminiUnavailableError('This browser does not expose the built-in AI Prompt API.')
  }

  const model = builtInAI('text', {
    language: 'en',
  })
  console.debug('[GeminiModel] builtInAI provider created with language=en')

  let availability: GeminiAvailability
  try {
    availability = (await model.availability()) as GeminiAvailability
    console.debug('[GeminiModel] availability', availability)
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

  if (!needsDownload) {
    console.debug('[GeminiModel] no download required')
    return model
  }

  if (needsDownload || !cachedModel) {
    try {
      console.debug('[GeminiModel] starting download')
      await model.createSessionWithProgress(progress => {
        console.log(`Download progress: ${Math.round(progress * 100)}%`)
        options?.onDownloadProgress?.(progress)
      })
      console.debug('[GeminiModel] download complete')
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        throw new GeminiPermissionError('Gemini Nano download must be triggered via user gesture.')
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw error
      }
      throw new GeminiInitializationError('Gemini Nano session bootstrap failed.', {
        cause: error,
      })
    }
  }

  console.debug('[GeminiModel] returning model after initialization')

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
