import type { Context, Hono } from 'hono'

import type { Env, WorkerEnv } from '../../env'
import type { AuthVariables } from '../../services/auth'
import type { LoggerVariables } from '../../services/logger'
import {
  MatchNotFoundError,
  PersistenceError,
  RoundConflictError,
  recordRoundResult,
} from '../../services/match-ingestion'
import { roundResultSchema } from '../../services/schemas'
import { postSentry } from './handlers/sentry'

type AppVariables = AuthVariables & LoggerVariables & { runtimeEnv: Env }

type ErrorCode =
  | 'INVALID_JSON'
  | 'VALIDATION_FAILED'
  | 'MATCH_NOT_FOUND'
  | 'ROUND_CONFLICT'
  | 'PERSISTENCE_ERROR'

type ErrorOptions = {
  details?: unknown
  context?: Record<string, unknown>
  logMessage?: string
  level?: 'warn' | 'info'
}

export function registerApiRoutes(
  app: Hono<{ Bindings: WorkerEnv; Variables: AppVariables }>,
): void {
  app.get('/version', (c) => {
    c.var.logger.info('version endpoint invoked')
    return c.json({ version: 'v1' })
  })

  app.post('/sentry', postSentry)

  app.post('/matches/complete', async (c) => {
    const { runtimeEnv } = c.var
    let payload: unknown
    try {
      payload = await c.req.json()
    } catch (error) {
      return respondWithError(c, 400, 'INVALID_JSON', 'Invalid JSON body', {
        logMessage: 'Failed to parse round result payload as JSON',
        context: { error: extractErrorMessage(error) },
      })
    }

    const parsed = roundResultSchema.safeParse(payload)
    if (!parsed.success) {
      return respondWithError(
        c,
        400,
        'VALIDATION_FAILED',
        'Invalid round payload',
        {
          logMessage: 'Round result validation failed',
          details: parsed.error.issues,
          context: { issues: parsed.error.issues },
        },
      )
    }

    try {
      const result = await recordRoundResult(runtimeEnv, parsed.data)
      const status = result.idempotent ? 200 : 201
      c.var.logger.info('Round result persisted', {
        matchId: result.matchId,
        roundId: result.roundId,
        idempotent: result.idempotent,
      })
      return c.json(result, status as never)
    } catch (error) {
      if (error instanceof MatchNotFoundError) {
        return respondWithError(c, 404, 'MATCH_NOT_FOUND', error.message, {
          logMessage: 'Attempted to append to a missing match',
        })
      }
      if (error instanceof RoundConflictError) {
        return respondWithError(c, 409, 'ROUND_CONFLICT', error.message, {
          logMessage: 'Round already recorded with different data',
        })
      }
      if (error instanceof PersistenceError) {
        return respondWithError(
          c,
          500,
          'PERSISTENCE_ERROR',
          'Failed to store round result',
          {
            logMessage: 'Database error while persisting round result',
            context: { error: extractErrorMessage(error.cause ?? error) },
            details: extractErrorMessage(error.cause ?? error),
          },
        )
      }
      return respondWithError(
        c,
        500,
        'PERSISTENCE_ERROR',
        'Unexpected server error',
        {
          logMessage: 'Unexpected error while saving round result',
          context: { error: extractErrorMessage(error) },
          details: extractErrorMessage(error),
        },
      )
    }
  })
}

function respondWithError(
  c: Context<{ Bindings: WorkerEnv; Variables: AppVariables }>,
  status: number,
  code: ErrorCode,
  message: string,
  options?: ErrorOptions,
) {
  const logger = c.var.logger
  const logMessage = options?.logMessage ?? message
  const context = { ...(options?.context ?? {}), code, status }
  if (status >= 500) {
    logger?.error(logMessage, context)
  } else {
    const level = options?.level ?? 'warn'
    if (level === 'info') {
      logger?.info(logMessage, context)
    } else {
      logger?.warn(logMessage, context)
    }
  }

  const body: Record<string, unknown> = { message, code }
  if (options?.details !== undefined) {
    body.details = options.details
  }
  return c.json(body, status as never)
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  try {
    return JSON.stringify(error)
  } catch {
    return 'Unknown error'
  }
}
