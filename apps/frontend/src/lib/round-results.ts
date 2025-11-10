import type { RoundResult, RoundResultResponse } from '@arena/schema'
import { roundResultResponseSchema, roundResultSchema } from '@arena/schema'

import { apiClient } from '@/lib/api-client'

const COMPLETE_MATCH_PATH = '/api/matches/complete'

let activeMatchId: string | undefined

export async function submitRoundResult(round: RoundResult): Promise<RoundResultResponse> {
  const parsedRound = roundResultSchema.parse(round)
  const payload: RoundResult = { ...parsedRound }

  if (activeMatchId) {
    payload.matchId = activeMatchId
  } else {
    delete payload.matchId
  }

  const response = await apiClient.post<RoundResultResponse, RoundResult>(
    COMPLETE_MATCH_PATH,
    payload,
  )
  const result = roundResultResponseSchema.parse(response)
  activeMatchId = result.matchId

  const { matchId, roundId, moveCount, persistedAt, idempotent } = result
  return { matchId, roundId, moveCount, persistedAt, idempotent }
}
