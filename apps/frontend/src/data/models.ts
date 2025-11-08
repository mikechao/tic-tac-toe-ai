import type { ModelId } from '@arena/schema'

export interface LocalAIModel {
  id: ModelId
  name: string
  provider: string
  variant: string
  website: string
}

export const localAIModels: LocalAIModel[] = [
  {
    id: 1,
    name: 'Gemini Nano',
    provider: 'Google DeepMind',
    variant: 'Built into your browser',
    website: 'https://developer.chrome.com/docs/ai/built-in',
  },
]
