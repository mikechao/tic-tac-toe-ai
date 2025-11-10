import type { ModelId } from '@arena/schema'
import {
  doesBrowserSupportTransformersJS,
  transformersJS,
} from '@built-in-ai/transformers-js'

import { registerModelProvider } from '@/lib/models/providers'
import type {
  BuiltInAIState,
  ModelDownloadProgress,
} from '@/lib/models/types'

export const TRANSFORMERS_PROVIDER_ID = 'transformers-js'
export const TRANSFORMERS_MODEL_ID = 2 as ModelId
const TRANSFORMERS_MODEL_SLUG = 'HuggingFaceTB/SmolLM2-360M-Instruct'

type TransformersAvailability = 'unavailable' | 'downloadable' | 'available'

const defaultModelOptions = {
  device: 'webgpu' as const,
}

let cachedModel: ReturnType<typeof transformersJS> | null = null
let isRegistered = false

function getModel() {
  if (!cachedModel) {
    cachedModel = transformersJS(TRANSFORMERS_MODEL_SLUG, defaultModelOptions)
  }
  return cachedModel
}

function mapAvailability(state: TransformersAvailability): BuiltInAIState {
  switch (state) {
    case 'available':
      return 'ready'
    case 'downloadable':
      return 'downloadable'
    default:
      return 'not-supported'
  }
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

export function detectTransformersSupport(): boolean {
  return doesBrowserSupportTransformersJS()
}

export async function checkTransformersAvailability(): Promise<BuiltInAIState> {
  if (!doesBrowserSupportTransformersJS()) {
    return 'not-supported'
  }
  const availability = await getModel().availability()
  return mapAvailability(availability as TransformersAvailability)
}

export async function startTransformersDownload(options?: {
  onProgress?: (progress: ModelDownloadProgress) => void
}): Promise<void> {
  if (!doesBrowserSupportTransformersJS()) {
    throw new Error('Transformers.js is not supported in this browser')
  }

  options?.onProgress?.(buildProgress('starting', 0))

  await getModel().createSessionWithProgress(({ progress }) => {
    const safeProgress = typeof progress === 'number' ? progress : 0
    options?.onProgress?.(buildProgress('downloading', safeProgress))
  })

  options?.onProgress?.(buildProgress('completed', 1))
}

export async function resetTransformersModel(): Promise<void> {
  cachedModel = null
}

export function registerTransformersProvider(): void {
  if (typeof window === 'undefined' || isRegistered) {
    return
  }

  registerModelProvider({
    id: TRANSFORMERS_PROVIDER_ID,
    detectSupport: detectTransformersSupport,
    checkAvailability: checkTransformersAvailability,
    startDownload: startTransformersDownload,
    reset: resetTransformersModel,
    getPrimaryModelId: () => TRANSFORMERS_MODEL_ID,
  })

  isRegistered = true
}

registerTransformersProvider()
