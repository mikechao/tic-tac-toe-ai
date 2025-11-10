import type { ModelId } from '@arena/schema'

export type LocalModelProvider =
  | 'chrome-builtin'
  | 'edge-builtin'
  | 'transformers-js'

export interface LocalAIModel {
  id: ModelId
  name: string
  provider: LocalModelProvider
  vendor: string
  variant: string
  website: string
  estimatedDownloadSizeMB?: number
  notes?: string
}

export const localAIModels: LocalAIModel[] = [
  {
    id: 1,
    name: 'Gemini Nano',
    provider: 'chrome-builtin',
    vendor: 'Google DeepMind',
    variant: 'Built into your browser',
    website: 'https://developer.chrome.com/docs/ai/built-in',
    estimatedDownloadSizeMB: 0,
    notes: 'Ships with Chrome; no additional download required.',
  },
  {
    id: 2,
    name: 'SmolLM2 360M Instruct',
    provider: 'transformers-js',
    vendor: 'Hugging Face',
    variant: 'Transformers.js (WebGPU)',
    website: 'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct',
    estimatedDownloadSizeMB: 220,
    notes: 'Approximate one-time download for q4f16 weights cached via Transformers.js.',
  },
]
