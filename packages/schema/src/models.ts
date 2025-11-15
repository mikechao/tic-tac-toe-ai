import type { ModelId } from './index'

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
    notes: 'Requires WebGPU (Chrome/Edge Canary).',
  },
  {
    id: 3,
    name: 'GPT-4o mini',
    provider: 'edge-builtin',
    vendor: 'OpenAI',
    variant: 'Built into Edge browser',
    website: 'https://developer.microsoft.com/en-us/microsoft-edge/platform/ai',
    estimatedDownloadSizeMB: 0,
    notes: 'Available in Microsoft Edge; no additional download required.',
  },
  {
    id: 4,
    name: 'Claude Haiku',
    provider: 'edge-builtin',
    vendor: 'Anthropic',
    variant: 'Built into Edge browser',
    website: 'https://developer.microsoft.com/en-us/microsoft-edge/platform/ai',
    estimatedDownloadSizeMB: 0,
    notes: 'Available in Microsoft Edge; no additional download required.',
  },
  {
    id: 5,
    name: 'Mistral Large',
    provider: 'edge-builtin',
    vendor: 'Mistral AI',
    variant: 'Built into Edge browser',
    website: 'https://developer.microsoft.com/en-us/microsoft-edge/platform/ai',
    estimatedDownloadSizeMB: 0,
    notes: 'Available in Microsoft Edge; no additional download required.',
  },
]

// Helper functions for working with models
export function getModelById(id: ModelId): LocalAIModel | null {
  return localAIModels.find(model => model.id === id) || null
}

export function getModelsByProvider(provider: LocalModelProvider): LocalAIModel[] {
  return localAIModels.filter(model => model.provider === provider)
}

export function getAllProviders(): LocalModelProvider[] {
  return [...new Set(localAIModels.map(model => model.provider))]
}