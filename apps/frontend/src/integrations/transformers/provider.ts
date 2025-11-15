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

import { clearTransformersStorage } from './storage'

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
  
  // First, check if model files are actually cached in browser storage
  const isCached = await isModelCached()
  if (isCached) {
    return 'ready'
  }
  
  // If not cached, check the model instance availability
  // (this will return 'downloadable' since instance isn't initialized)
  const availability = await getModel().availability()
  return mapAvailability(availability as TransformersAvailability)
}


// Debug utility to check what's in browser storage
// Check if model files are actually cached in browser storage
async function isModelCached(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof caches === 'undefined') {
    return false
  }
  
  try {
    // Check Cache API for model files
    const cacheNames = await caches.keys()
    const transformersCaches = cacheNames.filter(name => 
      name.includes('huggingface') || name.includes('transformers')
    )
    
    if (transformersCaches.length === 0) {
      return false
    }
    
    // Check if any of these caches have entries for our specific model
    for (const cacheName of transformersCaches) {
      const cache = await caches.open(cacheName)
      const keys = await cache.keys()
      
      // Look for model files (ONNX models, tokenizer files, etc.)
      const hasModelFiles = keys.some(request => 
        request.url.includes(TRANSFORMERS_MODEL_SLUG) ||
        request.url.includes('SmolLM2-360M')
      )
      
      if (hasModelFiles) {
        console.log(`[TransformersProvider] Found cached model files in: ${cacheName}`)
        return true
      }
    }
    
    return false
  } catch (error) {
    console.warn('[TransformersProvider] Error checking cache:', error)
    return false
  }
}

async function _debugStorageState(): Promise<void> {
  // This function can be uncommented for debugging cache issues
  // Keeping the structure here for future troubleshooting
  return
  
  /* Uncomment to debug storage state:
  if (typeof window === 'undefined') return
  
  console.log('[TransformersProvider] Storage debug:')
  
  // Check Cache API
  if (typeof caches !== 'undefined') {
    const cacheNames = await caches.keys()
    console.log('- Cache API keys:', cacheNames)
    for (const name of cacheNames) {
      if (name.includes('huggingface') || name.includes('transformers')) {
        const cache = await caches.open(name)
        const keys = await cache.keys()
        console.log(`  - ${name}: ${keys.length} entries`)
      }
    }
  }
  
  // Check IndexedDB
  if (typeof indexedDB !== 'undefined') {
    const dbs = await indexedDB.databases?.() ?? []
    console.log('- IndexedDB databases:', dbs.map(db => db.name))
  }
  */
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
  await clearTransformersStorage()
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
