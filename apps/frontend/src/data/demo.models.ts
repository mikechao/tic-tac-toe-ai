import type { ModelId } from '@arena/schema'

export interface DemoModel {
  id: ModelId
  name: string
  provider: string
  variant: string
  specialty: string
}

export const demoModels: DemoModel[] = [
  {
    id: 1,
    name: 'Gemini Nano',
    provider: 'Google DeepMind',
    variant: '1.5 Pro (on-device)',
    specialty: 'Aggressive openings, adaptive defense',
  },
  {
    id: 2,
    name: 'Gemini Flash',
    provider: 'Google DeepMind',
    variant: '1.5 Flash',
    specialty: 'Creative playstyle, responds quickly',
  },
  {
    id: 3,
    name: 'GPT-4o mini',
    provider: 'OpenAI',
    variant: '2025-03 Preview',
    specialty: 'Balanced strategy with late-game focus',
  },
  {
    id: 4,
    name: 'Claude Haiku',
    provider: 'Anthropic',
    variant: '2025 Q1',
    specialty: 'Defensive specialist, minimizes losses',
  },
  {
    id: 5,
    name: 'Mistral Large',
    provider: 'Mistral AI',
    variant: '24.01',
    specialty: 'Calculated plays with strong endgame',
  },
]
