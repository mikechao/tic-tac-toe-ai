import type { RoundResult, RoundResultResponse } from '@arena/schema'
import { roundResultResponseSchema, roundResultSchema } from '@arena/schema'
import * as Sentry from '@sentry/react'

import { ApiError, apiClient } from '@/lib/api-client'

const COMPLETE_MATCH_PATH = '/api/matches/complete'
const MATCH_ID_STORAGE_KEY = 'tic-tac-toe:matchId'
const BACKOFF_DELAYS_MS = [250, 1000, 4000]
const MAX_ATTEMPTS = BACKOFF_DELAYS_MS.length + 1

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
  const { result } = await postRoundResultWithRetry(payload)
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

async function postRoundResultWithRetry(
  payload: RoundResult,
): Promise<{ result: RoundResultResponse }> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await apiClient.post<RoundResultResponse, RoundResult>(
        COMPLETE_MATCH_PATH,
        payload,
      )
      const parsed = roundResultResponseSchema.parse(response)
      if (parsed.idempotent && attempt > 1) {
        captureIdempotentCompletion(attempt)
      }
      return { result: parsed }
    } catch (error) {
      if (error instanceof ApiError && error.code === 'MATCH_NOT_FOUND') {
        clearMatchId()
      }

      if (attempt >= MAX_ATTEMPTS) {
        captureRetriesExhausted(error, attempt)
        throw error
      }

      const nextDelay = getDelayForAttempt(attempt + 1)
      captureRetryTelemetry(error, attempt, nextDelay)
      await wait(nextDelay)
    }
  }

  throw new Error('Failed to submit round result after retries')
}

function getDelayForAttempt(attempt: number): number {
  if (attempt <= 1) {
    return 0
  }
  const delayIndex = attempt - 2
  if (delayIndex < 0) {
    return 0
  }
  return BACKOFF_DELAYS_MS[delayIndex] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1]
}

function wait(durationMs: number): Promise<void> {
  if (durationMs <= 0) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs)
  })
}

function captureRetryTelemetry(error: unknown, attempt: number, nextDelayMs: number): void {
  Sentry.withScope((scope) => {
    scope.setTag('roundResult.retryAttempt', attempt)
    scope.setContext('roundResultRetry', {
      attempt,
      maxAttempts: MAX_ATTEMPTS,
      nextDelayMs,
      path: COMPLETE_MATCH_PATH,
    })
    const normalizedError =
      error instanceof Error
        ? error
        : new Error('Failed to submit round result', {
            cause: typeof error === 'string' ? new Error(error) : undefined,
          })
    Sentry.captureException(normalizedError)
  })
}

function captureIdempotentCompletion(attempt: number): void {
  Sentry.addBreadcrumb({
    category: 'roundResult',
    message: 'Received idempotent completion while retrying round result',
    data: {
      attempt,
      maxAttempts: MAX_ATTEMPTS,
    },
    level: 'info',
  })
}

function captureRetriesExhausted(error: unknown, attempts: number): void {
  Sentry.withScope((scope) => {
    scope.setTag('roundResult.retryState', 'exhausted')
    scope.setContext('roundResultRetry', {
      attempts,
      maxAttempts: MAX_ATTEMPTS,
      path: COMPLETE_MATCH_PATH,
    })
    const normalizedError =
      error instanceof Error
        ? error
        : new Error('Round result retries exhausted', {
            cause: typeof error === 'string' ? new Error(error) : undefined,
          })
    Sentry.captureException(normalizedError)
  })
}
