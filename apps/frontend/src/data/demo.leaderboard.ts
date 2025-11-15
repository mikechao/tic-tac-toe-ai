import type { ModelId } from '@arena/schema'

import { localAIModels } from '@arena/schema/models'

export type RecentResult = 'W' | 'L' | 'T'

export interface DemoLeaderboardEntry {
  rank: number
  modelId: ModelId
  matches: number
  wins: number
  losses: number
  ties: number
  averageTurns: number
  winRate: number
  streak: {
    type: 'win' | 'loss' | 'tie'
    length: number
  }
  recentForm: RecentResult[]
  lastMatchup: {
    opponentId: ModelId
    result: RecentResult
    playedAt: string
  }
}

const defaultRecentForm: RecentResult[] = ['W', 'W', 'T', 'L', 'W']

const leaderboardEntries: DemoLeaderboardEntry[] = [
  {
    rank: 1,
    modelId: 1,
    matches: 128,
    wins: 79,
    losses: 33,
    ties: 16,
    averageTurns: 7.2,
    winRate: 0.617,
    streak: { type: 'win', length: 5 },
    recentForm: ['W', 'W', 'W', 'T', 'W'],
    lastMatchup: {
      opponentId: 3,
      result: 'W',
      playedAt: '2025-10-02T18:05:00.000Z',
    },
  },
  {
    rank: 2,
    modelId: 3,
    matches: 112,
    wins: 68,
    losses: 31,
    ties: 13,
    averageTurns: 7.8,
    winRate: 0.607,
    streak: { type: 'loss', length: 1 },
    recentForm: ['L', 'W', 'W', 'T', 'W'],
    lastMatchup: {
      opponentId: 1,
      result: 'L',
      playedAt: '2025-10-02T18:05:00.000Z',
    },
  },
  {
    rank: 3,
    modelId: 5,
    matches: 94,
    wins: 53,
    losses: 29,
    ties: 12,
    averageTurns: 7.6,
    winRate: 0.564,
    streak: { type: 'win', length: 2 },
    recentForm: ['W', 'T', 'W', 'L', 'W'],
    lastMatchup: {
      opponentId: 4,
      result: 'W',
      playedAt: '2025-10-01T21:42:00.000Z',
    },
  },
  {
    rank: 4,
    modelId: 2,
    matches: 86,
    wins: 44,
    losses: 30,
    ties: 12,
    averageTurns: 8.1,
    winRate: 0.512,
    streak: { type: 'tie', length: 1 },
    recentForm: ['T', 'W', 'L', 'W', 'L'],
    lastMatchup: {
      opponentId: 1,
      result: 'T',
      playedAt: '2025-10-02T12:18:00.000Z',
    },
  },
  {
    rank: 5,
    modelId: 4,
    matches: 90,
    wins: 41,
    losses: 35,
    ties: 14,
    averageTurns: 8.4,
    winRate: 0.455,
    streak: { type: 'loss', length: 2 },
    recentForm: ['L', 'L', 'W', 'T', 'W'],
    lastMatchup: {
      opponentId: 5,
      result: 'L',
      playedAt: '2025-10-01T21:42:00.000Z',
    },
  },
]

export type DemoLeaderboardViewEntry = DemoLeaderboardEntry & {
  model: (typeof localAIModels)[number] | undefined
  opponent: (typeof localAIModels)[number] | undefined
  recentForm: RecentResult[]
}

export const demoLeaderboardEntries: DemoLeaderboardViewEntry[] =
  leaderboardEntries.map((entry) => {
    const model = localAIModels.find((candidate) => candidate.id === entry.modelId)
    const opponent = localAIModels.find(
      (candidate) => candidate.id === entry.lastMatchup.opponentId,
    )

    return {
      ...entry,
      model,
      opponent,
      recentForm: entry.recentForm.length
        ? entry.recentForm
        : defaultRecentForm,
    }
  })

export const demoLeaderboardHighlights = [
  'Gemini Nano extends win streak to 5 after edging GPT-4o mini',
  'SmolLM2 defends WebGPU crown with 8 straight on-device wins',
  'Mistral Large unlocks new opening repertoire in latest patch',
  'Claude Haiku defense rate tops 70% across last 20 matches',
  'Gemini Flash ties with Nano – rematch scheduled for October 6',
] as const
