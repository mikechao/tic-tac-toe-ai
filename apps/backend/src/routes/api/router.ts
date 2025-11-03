import type { Hono } from 'hono'

import type { Env, WorkerEnv } from '../../env'
import type { AuthVariables } from '../../services/auth'
import type { LoggerVariables } from '../../services/logger'
import {
  countGamesForMatch,
  createMatchRecord,
  findMatchById,
  type MatchRecord,
} from '../../services/match-repository'
import type { MatchStatusResource } from '../../services/schemas'
import { createMatchSchema, matchParamsSchema } from '../../services/schemas'

type AppVariables = AuthVariables & LoggerVariables & { runtimeEnv: Env }

function toMatchStatusResource(record: MatchRecord, completedGames: number): MatchStatusResource {
  const safeCompletedGames = Math.max(0, Math.min(completedGames, record.totalRounds))
  const isComplete = safeCompletedGames >= record.totalRounds
  const currentGameIndex = isComplete ? record.totalRounds : safeCompletedGames + 1
  const createdAt =
    record.createdAt instanceof Date ? record.createdAt.toISOString() : new Date(record.createdAt).toISOString()

  return {
    id: record.id,
    modelAId: record.modelAId,
    modelBId: record.modelBId,
    difficulty: record.difficulty as MatchStatusResource['difficulty'],
    totalRounds: record.totalRounds,
    createdAt,
    completedGames: safeCompletedGames,
    currentGameIndex,
    isComplete,
  }
}

export function registerApiRoutes(app: Hono<{ Bindings: WorkerEnv; Variables: AppVariables }>): void {
  app.get('/version', (c) => {
    c.var.logger.info('version endpoint invoked')
    return c.json({ version: 'v0' })
  })

  app.post('/sessions', async (c) => {
    const { logger, runtimeEnv } = c.var

    let payload: unknown
    try {
      payload = await c.req.json()
    } catch (error) {
      logger.warn('Failed to parse session creation payload as JSON', { error })
      return c.json({ message: 'Invalid JSON body' }, 400)
    }

    const parsed = createMatchSchema.safeParse(payload)

    if (!parsed.success) {
      logger.warn('Session creation validation failed', { issues: parsed.error.issues })
      return c.json({ message: 'Invalid request payload', issues: parsed.error.issues }, 400)
    }

    const record = await createMatchRecord(runtimeEnv, parsed.data)
    const session = toMatchStatusResource(record, 0)

    logger.info('Session created', { sessionId: session.id })
    return c.json({ session }, 201)
  })

  app.get('/sessions/:matchId', async (c) => {
    const { logger, runtimeEnv } = c.var

    const paramsResult = matchParamsSchema.safeParse(c.req.param())
    if (!paramsResult.success) {
      logger.warn('Invalid session params received', { issues: paramsResult.error.issues })
      return c.json({ message: 'Invalid session identifier', issues: paramsResult.error.issues }, 400)
    }

    const match = await findMatchById(runtimeEnv, paramsResult.data.matchId)
    if (!match) {
      logger.warn('Session not found', { sessionId: paramsResult.data.matchId })
      return c.json({ message: 'Session not found' }, 404)
    }

    const completedGames = await countGamesForMatch(runtimeEnv, match.id)
    const session = toMatchStatusResource(match, completedGames)

    return c.json({ session })
  })
}
