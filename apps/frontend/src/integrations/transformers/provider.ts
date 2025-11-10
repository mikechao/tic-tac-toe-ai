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
export const TRANSFORMERS_MODEL_SLUG = 'HuggingFaceTB/SmolLM2-360M-Instruct'

type TransformersAvailability = 'unavailable' | 'downloadable' | 'available'

const defaultModelOptions = {
  device: 'webgpu' as const,
}

let cachedModel: ReturnType<typeof transformersJS> | null = null
let isRegistered = false
let workerInstance: Worker | null = null

function getWorker(): Worker | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }
  if (!workerInstance) {
    workerInstance = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    })
  }
  return workerInstance
}

export function getTransformersWorker(): Worker | undefined {
  return getWorker()
}

export function createTransformersModel(options?: {
  initProgressCallback?: (payload: { progress?: number }) => void
}) {
  return transformersJS(TRANSFORMERS_MODEL_SLUG, {
    ...defaultModelOptions,
    worker: getWorker(),
    ...options,
  })
}

function getModel() {
  if (!cachedModel) {
    cachedModel = createTransformersModel()
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
  if (workerInstance) {
    workerInstance.terminate()
    workerInstance = null
  }
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
