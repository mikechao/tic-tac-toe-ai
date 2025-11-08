import type { ModelId } from '@arena/schema'

export type BuiltInAIProvider = 'chrome-builtin' | 'edge-builtin'

export interface LocalAIModel {
  id: ModelId
  name: string
  provider: BuiltInAIProvider
  vendor: string
  variant: string
  website: string
}

export const localAIModels: LocalAIModel[] = [
  {
    id: 1,
    name: 'Gemini Nano',
    provider: 'chrome-builtin',
    vendor: 'Google DeepMind',
    variant: 'Built into your browser',
    website: 'https://developer.chrome.com/docs/ai/built-in',
  },
]
