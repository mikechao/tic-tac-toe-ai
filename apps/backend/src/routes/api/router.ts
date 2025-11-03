import type { Context, Hono } from 'hono'

import type { Env, WorkerEnv } from '../../env'
import type { AuthVariables } from '../../services/auth'
import { emitEvent } from '../../lib/events'
import {
  createGameRecord,
  createMoveRecord,
  findGameById,
  findGameByMatchAndRound,
  listMovesForGame,
  type GameRecord,
  type MoveRecord,
} from '../../services/game-repository'
import { applyGameOutcomeToLeaderboard, getLeaderboard } from '../../services/leaderboard-repository'
import type { LoggerVariables } from '../../services/logger'
import {
  countGamesForMatch,
  createMatchRecord,
  findMatchById,
  type MatchRecord,
} from '../../services/match-repository'
import type { GameResource, MatchStatusResource, MoveResource } from '../../services/schemas'
import {
  createGameSchema,
  createMatchSchema,
  createMoveSchema,
  gameParamsSchema,
  leaderboardResponseSchema,
  matchParamsSchema,
} from '../../services/schemas'

type AppVariables = AuthVariables & LoggerVariables & { runtimeEnv: Env }

const winningLines: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

const MAX_REASONING_LENGTH = 1000
const MAX_MOVES_PER_GAME = 9

type ErrorCode =
  | 'INVALID_JSON'
  | 'VALIDATION_FAILED'
  | 'INVALID_SESSION_PARAMS'
  | 'SESSION_NOT_FOUND'
  | 'ROUND_OUT_OF_BOUNDS'
  | 'GAME_ALREADY_EXISTS'
  | 'BOARD_MISMATCH'
  | 'PERSISTENCE_ERROR'
  | 'LEADERBOARD_UNAVAILABLE'
  | 'INVALID_GAME_PARAMS'
  | 'GAME_NOT_FOUND'
  | 'MOVE_LIMIT_REACHED'
  | 'MOVE_SEQUENCE_CONFLICT'
  | 'MOVE_ACTOR_INVALID'
  | 'MOVE_POSITION_TAKEN'
  | 'MOVE_POSITION_MISSING'
  | 'MOVE_ACTOR_MISMATCH'
  | 'MOVE_EXCEEDS_BOARD'
  | 'LEADERBOARD_UPDATE_FAILED'

type ErrorOptions = {
  details?: unknown
  context?: Record<string, unknown>
  logMessage?: string
  level?: 'warn' | 'info'
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

function respondWithError(
  c: Context<{ Bindings: WorkerEnv; Variables: AppVariables }>,
  status: number,
  code: ErrorCode,
  message: string,
  options?: ErrorOptions
) {
  const logger = c.var.logger
  const logMessage = options?.logMessage ?? message
  const context = { ...(options?.context ?? {}), code, status }
  if (status >= 500) {
    logger?.error(logMessage, context)
    emitEvent('error', { message: logMessage, context })
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

function toGameResource(record: GameRecord): GameResource {
  const createdAt =
    record.createdAt instanceof Date ? record.createdAt.toISOString() : new Date(record.createdAt).toISOString()

  return {
    id: record.id,
    matchId: record.matchId,
    round: record.round,
    winner: record.winner as GameResource['winner'],
    board: record.boardState as GameResource['board'],
    createdAt,
  }
}

function toMoveResource(record: MoveRecord): MoveResource {
  const createdAt =
    record.createdAt instanceof Date ? record.createdAt.toISOString() : new Date(record.createdAt).toISOString()

  return {
    id: record.id,
    gameId: record.gameId,
    moveIndex: record.moveIndex,
    position: record.position,
    actor: record.actor as MoveResource['actor'],
    reasoning: record.reasoning ?? undefined,
    createdAt,
  }
}

function hasWinner(board: GameResource['board'], actor: 'modelA' | 'modelB'): boolean {
  return winningLines.some((line) => line.every((index) => board[index] === actor))
}

function boardStateMatchesWinner(board: GameResource['board'], winner: GameResource['winner']): boolean {
  const modelACount = board.filter((cell) => cell === 'modelA').length
  const modelBCount = board.filter((cell) => cell === 'modelB').length
  const diff = Math.abs(modelACount - modelBCount)

  if (diff > 1) {
    return false
  }

  const modelAWins = hasWinner(board, 'modelA')
  const modelBWins = hasWinner(board, 'modelB')

  if (winner === 'modelA') {
    return modelAWins && !modelBWins && modelACount === modelBCount + 1
  }

  if (winner === 'modelB') {
    return modelBWins && !modelAWins && modelBCount === modelACount
  }

  // winner === 'tie'
  const boardFull = board.every((cell) => cell !== null)
  return !modelAWins && !modelBWins && boardFull && modelACount === modelBCount
}

export function registerApiRoutes(app: Hono<{ Bindings: WorkerEnv; Variables: AppVariables }>): void {
  app.get('/version', (c) => {
    c.var.logger.info('version endpoint invoked')
    return c.json({ version: 'v0' })
  })

  app.get('/leaderboard', async (c) => {
    const { runtimeEnv } = c.var
    try {
      const leaderboard = await getLeaderboard(runtimeEnv)
      const validation = leaderboardResponseSchema.safeParse(leaderboard)
      if (!validation.success) {
        return respondWithError(c, 500, 'LEADERBOARD_UNAVAILABLE', 'Leaderboard unavailable', {
          logMessage: 'Leaderboard response failed to validate',
          details: validation.error.issues,
          context: { issues: validation.error.issues },
        })
      }
      return c.json(leaderboard)
    } catch (error) {
      return respondWithError(c, 500, 'LEADERBOARD_UNAVAILABLE', 'Leaderboard unavailable', {
        logMessage: 'Failed to load leaderboard',
        context: { error: extractErrorMessage(error) },
      })
    }
  })

  app.post('/sessions', async (c) => {
    const { logger, runtimeEnv } = c.var

    let payload: unknown
    try {
      payload = await c.req.json()
    } catch (error) {
      return respondWithError(c, 400, 'INVALID_JSON', 'Invalid JSON body', {
        logMessage: 'Failed to parse session creation payload as JSON',
        context: { error: extractErrorMessage(error) },
      })
    }

    const parsed = createMatchSchema.safeParse(payload)

    if (!parsed.success) {
      return respondWithError(c, 400, 'VALIDATION_FAILED', 'Invalid request payload', {
        logMessage: 'Session creation validation failed',
        details: parsed.error.issues,
        context: { issues: parsed.error.issues },
      })
    }

    let record: MatchRecord
    try {
      record = await createMatchRecord(runtimeEnv, parsed.data)
    } catch (error) {
      return respondWithError(c, 500, 'PERSISTENCE_ERROR', 'Failed to create session', {
        logMessage: 'Failed to persist session',
        context: {
          error: extractErrorMessage(error),
          modelAId: parsed.data.modelAId,
          modelBId: parsed.data.modelBId,
        },
      })
    }
    const session = toMatchStatusResource(record, 0)

    emitEvent('match:start', {
      matchId: record.id,
      modelAId: record.modelAId,
      modelBId: record.modelBId,
      totalRounds: record.totalRounds,
      difficulty: record.difficulty,
    })

    logger?.info('Session created', { sessionId: session.id })
    return c.json({ session }, 201)
  })

  app.get('/sessions/:matchId', async (c) => {
    const { runtimeEnv } = c.var

    const paramsResult = matchParamsSchema.safeParse(c.req.param())
    if (!paramsResult.success) {
      return respondWithError(c, 400, 'INVALID_SESSION_PARAMS', 'Invalid session identifier', {
        logMessage: 'Invalid session params received',
        details: paramsResult.error.issues,
        context: { issues: paramsResult.error.issues },
      })
    }

    const match = await findMatchById(runtimeEnv, paramsResult.data.matchId)
    if (!match) {
      return respondWithError(c, 404, 'SESSION_NOT_FOUND', 'Session not found', {
        logMessage: 'Session not found',
        context: { sessionId: paramsResult.data.matchId },
      })
    }

    let completedGames: number
    try {
      completedGames = await countGamesForMatch(runtimeEnv, match.id)
    } catch (error) {
      return respondWithError(c, 500, 'PERSISTENCE_ERROR', 'Failed to load session status', {
        logMessage: 'Failed to count games for session',
        context: { error: extractErrorMessage(error), sessionId: match.id },
      })
    }
    const session = toMatchStatusResource(match, completedGames)

    return c.json({ session })
  })

  app.post('/sessions/:matchId/games', async (c) => {
    const { logger, runtimeEnv } = c.var

    const paramsResult = matchParamsSchema.safeParse(c.req.param())
    if (!paramsResult.success) {
      return respondWithError(c, 400, 'INVALID_SESSION_PARAMS', 'Invalid session identifier', {
        logMessage: 'Invalid session params received for game creation',
        details: paramsResult.error.issues,
        context: { issues: paramsResult.error.issues },
      })
    }

    const match = await findMatchById(runtimeEnv, paramsResult.data.matchId)
    if (!match) {
      return respondWithError(c, 404, 'SESSION_NOT_FOUND', 'Session not found', {
        logMessage: 'Attempted to create game for missing session',
        context: { sessionId: paramsResult.data.matchId },
      })
    }

    let payload: unknown
    try {
      payload = await c.req.json()
    } catch (error) {
      return respondWithError(c, 400, 'INVALID_JSON', 'Invalid JSON body', {
        logMessage: 'Failed to parse game creation payload as JSON',
        context: { error: extractErrorMessage(error) },
      })
    }

    const parsed = createGameSchema.safeParse(payload)
    if (!parsed.success) {
      return respondWithError(c, 400, 'VALIDATION_FAILED', 'Invalid request payload', {
        logMessage: 'Game creation validation failed',
        details: parsed.error.issues,
        context: { issues: parsed.error.issues, sessionId: match.id },
      })
    }

    if (parsed.data.round < 1 || parsed.data.round > match.totalRounds) {
      return respondWithError(c, 400, 'ROUND_OUT_OF_BOUNDS', 'Round exceeds configured session length', {
        logMessage: 'Game round is out of bounds for session',
        context: {
          sessionId: match.id,
          requestedRound: parsed.data.round,
          totalRounds: match.totalRounds,
        },
      })
    }

    const existingGame = await findGameByMatchAndRound(runtimeEnv, match.id, parsed.data.round)
    if (existingGame) {
      return respondWithError(c, 409, 'GAME_ALREADY_EXISTS', 'Game already recorded for this round', {
        logMessage: 'Game already exists for round',
        context: { sessionId: match.id, round: parsed.data.round },
      })
    }

    if (!boardStateMatchesWinner(parsed.data.board, parsed.data.winner)) {
      return respondWithError(c, 400, 'BOARD_MISMATCH', 'Board state does not match declared winner', {
        logMessage: 'Board state does not align with declared winner',
        context: {
          sessionId: match.id,
          round: parsed.data.round,
          winner: parsed.data.winner,
        },
      })
    }

    let gameRecord: GameRecord
    try {
      gameRecord = await createGameRecord(runtimeEnv, match.id, parsed.data)
    } catch (error) {
      return respondWithError(c, 500, 'PERSISTENCE_ERROR', 'Failed to record game', {
        logMessage: 'Failed to persist game for session',
        context: {
          error: extractErrorMessage(error),
          sessionId: match.id,
          round: parsed.data.round,
        },
      })
    }

    let affectedModelIds: number[]
    try {
      affectedModelIds = await applyGameOutcomeToLeaderboard(runtimeEnv, match, parsed.data.winner)
    } catch (error) {
      return respondWithError(c, 500, 'LEADERBOARD_UPDATE_FAILED', 'Failed to update leaderboard', {
        logMessage: 'Failed to apply game outcome to leaderboard',
        context: {
          error: extractErrorMessage(error),
          sessionId: match.id,
          round: parsed.data.round,
        },
      })
    }

    const game = toGameResource(gameRecord)
    let completedGames: number
    try {
      completedGames = await countGamesForMatch(runtimeEnv, match.id)
    } catch (error) {
      return respondWithError(c, 500, 'PERSISTENCE_ERROR', 'Failed to load session status', {
        logMessage: 'Failed to recount games after recording game',
        context: { error: extractErrorMessage(error), sessionId: match.id },
      })
    }
    const session = toMatchStatusResource(match, completedGames)

    emitEvent('game:recorded', {
      matchId: match.id,
      gameId: game.id,
      round: game.round,
      winner: game.winner,
    })

    if (session.isComplete) {
      emitEvent('match:end', {
        matchId: session.id,
        completedGames: session.completedGames,
        currentGameIndex: session.currentGameIndex,
        isComplete: session.isComplete,
      })
    } else {
      emitEvent('match:update', {
        matchId: session.id,
        completedGames: session.completedGames,
        currentGameIndex: session.currentGameIndex,
        isComplete: session.isComplete,
      })
    }

    emitEvent('leaderboard:update', { modelIds: affectedModelIds })

    logger?.info('Game recorded for session', { sessionId: session.id, gameId: game.id, round: game.round })
    return c.json({ game, session }, 201)
  })

  app.post('/games/:gameId/moves', async (c) => {
    const { logger, runtimeEnv } = c.var

    const paramsResult = gameParamsSchema.safeParse(c.req.param())
    if (!paramsResult.success) {
      return respondWithError(c, 400, 'INVALID_GAME_PARAMS', 'Invalid game identifier', {
        logMessage: 'Invalid game params received for move creation',
        details: paramsResult.error.issues,
        context: { issues: paramsResult.error.issues },
      })
    }

    const game = await findGameById(runtimeEnv, paramsResult.data.gameId)
    if (!game) {
      return respondWithError(c, 404, 'GAME_NOT_FOUND', 'Game not found', {
        logMessage: 'Move attempted for missing game',
        context: { gameId: paramsResult.data.gameId },
      })
    }

    let payload: unknown
    try {
      payload = await c.req.json()
    } catch (error) {
      return respondWithError(c, 400, 'INVALID_JSON', 'Invalid JSON body', {
        logMessage: 'Failed to parse move creation payload as JSON',
        context: { error: extractErrorMessage(error) },
      })
    }

    const parsed = createMoveSchema.safeParse(payload)
    if (!parsed.success) {
      return respondWithError(c, 400, 'VALIDATION_FAILED', 'Invalid request payload', {
        logMessage: 'Move creation validation failed',
        details: parsed.error.issues,
        context: { issues: parsed.error.issues, gameId: game.id },
      })
    }

    let existingMoves: MoveRecord[]
    try {
      existingMoves = await listMovesForGame(runtimeEnv, game.id)
    } catch (error) {
      return respondWithError(c, 500, 'PERSISTENCE_ERROR', 'Failed to load game moves', {
        logMessage: 'Failed to list moves for game',
        context: { error: extractErrorMessage(error), gameId: game.id },
      })
    }
    const expectedMoveIndex = existingMoves.length

    if (expectedMoveIndex >= MAX_MOVES_PER_GAME) {
      return respondWithError(c, 409, 'MOVE_LIMIT_REACHED', 'All moves already recorded for this game', {
        logMessage: 'Attempted to record move beyond board capacity',
        context: { gameId: game.id },
      })
    }

    if (parsed.data.moveIndex !== expectedMoveIndex) {
      return respondWithError(c, 409, 'MOVE_SEQUENCE_CONFLICT', 'Moves must be logged sequentially', {
        logMessage: 'Move index out of sequence',
        context: {
          gameId: game.id,
          expectedMoveIndex,
          receivedMoveIndex: parsed.data.moveIndex,
        },
      })
    }

    const expectedActor = expectedMoveIndex % 2 === 0 ? 'modelA' : 'modelB'
    if (parsed.data.actor !== expectedActor) {
      return respondWithError(c, 409, 'MOVE_ACTOR_INVALID', 'Invalid actor for move order', {
        logMessage: 'Move actor order invalid',
        context: {
          gameId: game.id,
          expectedActor,
          receivedActor: parsed.data.actor,
        },
      })
    }

    const positionTaken = existingMoves.some((moveRecord) => moveRecord.position === parsed.data.position)
    if (positionTaken) {
      return respondWithError(c, 409, 'MOVE_POSITION_TAKEN', 'Position already occupied', {
        logMessage: 'Move position already used',
        context: { gameId: game.id, position: parsed.data.position },
      })
    }

    const board = (game.boardState ?? []) as GameResource['board']
    const finalCellOwner = board[parsed.data.position]
    if (finalCellOwner === null) {
      return respondWithError(c, 409, 'MOVE_POSITION_MISSING', 'Final board state does not include this move', {
        logMessage: 'Move position is empty in final board state',
        context: { gameId: game.id, position: parsed.data.position },
      })
    }

    if (finalCellOwner !== parsed.data.actor) {
      return respondWithError(c, 409, 'MOVE_ACTOR_MISMATCH', 'Move actor mismatch for recorded board state', {
        logMessage: 'Move actor does not match final board cell owner',
        context: {
          gameId: game.id,
          position: parsed.data.position,
          actor: parsed.data.actor,
          cellOwner: finalCellOwner,
        },
      })
    }

    const occupiedCells = board.filter((cell) => cell !== null).length
    if (expectedMoveIndex >= occupiedCells) {
      return respondWithError(c, 409, 'MOVE_EXCEEDS_BOARD', 'Move exceeds final board state', {
        logMessage: 'Move count exceeds occupied board cells',
        context: {
          gameId: game.id,
          occupiedCells,
          attemptedIndex: expectedMoveIndex,
        },
      })
    }

    const trimmedReasoning = parsed.data.reasoning?.trim()
    const normalizedReasoning =
      trimmedReasoning && trimmedReasoning.length > 0
        ? trimmedReasoning.slice(0, MAX_REASONING_LENGTH)
        : undefined

    let moveRecord: MoveRecord
    try {
      moveRecord = await createMoveRecord(runtimeEnv, game.id, {
        ...parsed.data,
        reasoning: normalizedReasoning,
      })
    } catch (error) {
      return respondWithError(c, 500, 'PERSISTENCE_ERROR', 'Failed to record move', {
        logMessage: 'Failed to persist move for game',
        context: { error: extractErrorMessage(error), gameId: game.id },
      })
    }
    const move = toMoveResource(moveRecord)

    emitEvent('move:recorded', {
      gameId: move.gameId,
      moveId: move.id,
      moveIndex: move.moveIndex,
      position: move.position,
      actor: move.actor,
    })

    logger?.info('Move recorded for game', { gameId: game.id, moveId: move.id })
    return c.json({ move }, 201)
  })
}
