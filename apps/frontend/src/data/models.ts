import type { ModelId } from '@arena/schema'

export interface LocalAIModel {
  id: ModelId
  name: string
  provider: string
  variant: string}

export const localAIModels: LocalAIModel[] = [
  {
    id: 1,
    name: 'Gemini Nano',
    provider: 'Google DeepMind',
    variant: 'Built into your browser',
  },
]
