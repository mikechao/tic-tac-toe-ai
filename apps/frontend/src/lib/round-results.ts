import type { RoundResult, RoundResultResponse } from '@arena/schema'
import { roundResultResponseSchema, roundResultSchema } from '@arena/schema'
import * as Sentry from '@sentry/react'

import { ApiError, apiClient } from '@/lib/api-client'

const COMPLETE_MATCH_PATH = '/api/matches/complete'
const MATCH_ID_STORAGE_KEY = 'tic-tac-toe:matchId'
export const ROUND_CONFLICT_EVENT = 'round-result:round-conflict'
export const MATCH_NOT_FOUND_EVENT = 'round-result:match-not-found'
export const ROUND_RESULT_ERROR_EVENT = 'round-result:submission-error'
export const ROUND_RESULT_RETRY_REQUEST_EVENT = 'round-result:retry-requested'
export type RoundConflictEventDetail = { matchId?: string }
export type MatchNotFoundEventDetail = { matchId?: string }
export type RoundResultErrorEventDetail = {
  message: string
  code?: string
  status?: number
  retryable: boolean
}
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

export function clearMatchId() {
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
      if (error instanceof ApiError) {
        if (error.code === 'MATCH_NOT_FOUND') {
          const staleMatchId = activeMatchId
          clearMatchId()
          emitMatchNotFoundEvent({ matchId: staleMatchId })
          throw error
        }
        if (error.code === 'ROUND_CONFLICT') {
          const conflictingMatchId = activeMatchId
          clearMatchId()
          emitRoundConflictEvent({ matchId: conflictingMatchId })
          throw error
        }

        if (isClientError(error.status)) {
          emitRoundResultErrorEvent({
            message: error.message,
            code: error.code,
            status: error.status,
            retryable: false,
          })
          throw error
        }
      }

      if (attempt >= MAX_ATTEMPTS) {
        emitRoundResultErrorEvent({
          message: getErrorMessage(error),
          code: error instanceof ApiError ? error.code : undefined,
          status: error instanceof ApiError ? error.status : undefined,
          retryable: true,
        })
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

function emitRoundConflictEvent(detail: RoundConflictEventDetail): void {
  if (typeof window === 'undefined') {
    return
  }
  const event = new CustomEvent<RoundConflictEventDetail>(
    ROUND_CONFLICT_EVENT,
    {
      detail,
    },
  )
  window.dispatchEvent(event)
}

function emitMatchNotFoundEvent(detail: MatchNotFoundEventDetail): void {
  if (typeof window === 'undefined') {
    return
  }
  const event = new CustomEvent<MatchNotFoundEventDetail>(
    MATCH_NOT_FOUND_EVENT,
    {
      detail,
    },
  )
  window.dispatchEvent(event)
}

function emitRoundResultErrorEvent(detail: RoundResultErrorEventDetail): void {
  if (typeof window === 'undefined') {
    return
  }
  const event = new CustomEvent<RoundResultErrorEventDetail>(
    ROUND_RESULT_ERROR_EVENT,
    {
      detail,
    },
  )
  window.dispatchEvent(event)
}

function isClientError(status?: number): boolean {
  return typeof status === 'number' && status >= 400 && status < 500
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unexpected error while saving your round'
}
