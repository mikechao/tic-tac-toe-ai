import type { MatchListResponse } from '@arena/schema'
import { matchListResponseSchema } from '@arena/schema'

const rawDemoMatches: MatchListResponse = {
  matches: [
    {
      id: 1,
      modelAId: 1,
      modelBId: 2,
      totalRounds: 5,
      createdAt: '2025-10-01T15:32:10.000Z',
    },
    {
      id: 2,
      modelAId: 3,
      modelBId: 4,
      totalRounds: 3,
      createdAt: '2025-10-02T11:05:00.000Z',
    },
  ],
}

export const demoMatches = matchListResponseSchema.parse(rawDemoMatches)
