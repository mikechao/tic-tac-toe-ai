import type { RoundResult, RoundResultResponse } from '@arena/schema'
import { roundResultResponseSchema, roundResultSchema } from '@arena/schema'

import { ApiError, apiClient } from '@/lib/api-client'

const COMPLETE_MATCH_PATH = '/api/matches/complete'
const MATCH_ID_STORAGE_KEY = 'tic-tac-toe:matchId'

let activeMatchId: string | undefined

export async function submitRoundResult(round: RoundResult): Promise<RoundResultResponse> {
  ensureMatchIdLoaded()
  const parsedRound = roundResultSchema.parse(round)
  const payload: RoundResult = { ...parsedRound }

  if (activeMatchId) {
    payload.matchId = activeMatchId
  } else {
    delete payload.matchId
  }

  const hadMatchId = Boolean(activeMatchId)
  let response: RoundResultResponse
  try {
    response = await apiClient.post<RoundResultResponse, RoundResult>(
      COMPLETE_MATCH_PATH,
      payload,
    )
  } catch (error) {
    if (error instanceof ApiError && error.code === 'MATCH_NOT_FOUND') {
      clearMatchId()
    }
    throw error
  }
  const result = roundResultResponseSchema.parse(response)
  activeMatchId = result.matchId

  if (!hadMatchId) {
    persistMatchId(result.matchId)
  }

  const { matchId, roundId, moveCount, persistedAt, idempotent } = result
  return { matchId, roundId, moveCount, persistedAt, idempotent }
}

function persistMatchId(matchId: string) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(MATCH_ID_STORAGE_KEY, matchId)
  } catch {
    // Swallow storage errors so network success isn't blocked.
  }
}

function ensureMatchIdLoaded() {
  if (activeMatchId || typeof window === 'undefined') {
    return
  }

  try {
    const cached = window.localStorage.getItem(MATCH_ID_STORAGE_KEY)
    activeMatchId = cached ?? undefined
  } catch {
    activeMatchId = undefined
  }
}

function clearMatchId() {
  activeMatchId = undefined

  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(MATCH_ID_STORAGE_KEY)
  } catch {
    // ignore storage errors when clearing cache
  }
}
