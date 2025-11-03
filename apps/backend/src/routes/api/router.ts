import type { Hono } from 'hono'

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
    const { logger, runtimeEnv } = c.var
    const leaderboard = await getLeaderboard(runtimeEnv)

    const validation = leaderboardResponseSchema.safeParse(leaderboard)
    if (!validation.success) {
      logger.error('Leaderboard response failed to validate', { issues: validation.error.issues })
      return c.json({ message: 'Leaderboard unavailable' }, 500)
    }

    return c.json(leaderboard)
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

    emitEvent('match:start', {
      matchId: record.id,
      modelAId: record.modelAId,
      modelBId: record.modelBId,
      totalRounds: record.totalRounds,
      difficulty: record.difficulty,
    })

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

  app.post('/sessions/:matchId/games', async (c) => {
    const { logger, runtimeEnv } = c.var

    const paramsResult = matchParamsSchema.safeParse(c.req.param())
    if (!paramsResult.success) {
      logger.warn('Invalid session params received for game creation', { issues: paramsResult.error.issues })
      return c.json({ message: 'Invalid session identifier', issues: paramsResult.error.issues }, 400)
    }

    const match = await findMatchById(runtimeEnv, paramsResult.data.matchId)
    if (!match) {
      logger.warn('Attempted to create game for missing session', { sessionId: paramsResult.data.matchId })
      return c.json({ message: 'Session not found' }, 404)
    }

    let payload: unknown
    try {
      payload = await c.req.json()
    } catch (error) {
      logger.warn('Failed to parse game creation payload as JSON', { error })
      return c.json({ message: 'Invalid JSON body' }, 400)
    }

    const parsed = createGameSchema.safeParse(payload)
    if (!parsed.success) {
      logger.warn('Game creation validation failed', { issues: parsed.error.issues })
      return c.json({ message: 'Invalid request payload', issues: parsed.error.issues }, 400)
    }

    if (parsed.data.round < 1 || parsed.data.round > match.totalRounds) {
      logger.warn('Game round is out of bounds for session', {
        sessionId: match.id,
        requestedRound: parsed.data.round,
        totalRounds: match.totalRounds,
      })
      return c.json({ message: 'Round exceeds configured session length' }, 400)
    }

    const existingGame = await findGameByMatchAndRound(runtimeEnv, match.id, parsed.data.round)
    if (existingGame) {
      logger.warn('Game already exists for round', {
        sessionId: match.id,
        round: parsed.data.round,
      })
      return c.json({ message: 'Game already recorded for this round' }, 409)
    }

    if (!boardStateMatchesWinner(parsed.data.board, parsed.data.winner)) {
      logger.warn('Board state does not align with declared winner', {
        sessionId: match.id,
        round: parsed.data.round,
        winner: parsed.data.winner,
      })
      return c.json({ message: 'Board state does not match declared winner' }, 400)
    }

    const gameRecord = await createGameRecord(runtimeEnv, match.id, parsed.data)
    const affectedModelIds = await applyGameOutcomeToLeaderboard(runtimeEnv, match, parsed.data.winner)

    const game = toGameResource(gameRecord)
    const completedGames = await countGamesForMatch(runtimeEnv, match.id)
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

    logger.info('Game recorded for session', { sessionId: session.id, gameId: game.id, round: game.round })
    return c.json({ game, session }, 201)
  })

  app.post('/games/:gameId/moves', async (c) => {
    const { logger, runtimeEnv } = c.var

    const paramsResult = gameParamsSchema.safeParse(c.req.param())
    if (!paramsResult.success) {
      logger.warn('Invalid game params received for move creation', { issues: paramsResult.error.issues })
      return c.json({ message: 'Invalid game identifier', issues: paramsResult.error.issues }, 400)
    }

    const game = await findGameById(runtimeEnv, paramsResult.data.gameId)
    if (!game) {
      logger.warn('Move attempted for missing game', { gameId: paramsResult.data.gameId })
      return c.json({ message: 'Game not found' }, 404)
    }

    let payload: unknown
    try {
      payload = await c.req.json()
    } catch (error) {
      logger.warn('Failed to parse move creation payload as JSON', { error })
      return c.json({ message: 'Invalid JSON body' }, 400)
    }

    const parsed = createMoveSchema.safeParse(payload)
    if (!parsed.success) {
      logger.warn('Move creation validation failed', { issues: parsed.error.issues })
      return c.json({ message: 'Invalid request payload', issues: parsed.error.issues }, 400)
    }

    const existingMoves = await listMovesForGame(runtimeEnv, game.id)
    const expectedMoveIndex = existingMoves.length

    if (expectedMoveIndex >= MAX_MOVES_PER_GAME) {
      logger.warn('Attempted to record move beyond board capacity', { gameId: game.id })
      return c.json({ message: 'All moves already recorded for this game' }, 409)
    }

    if (parsed.data.moveIndex !== expectedMoveIndex) {
      logger.warn('Move index out of sequence', {
        gameId: game.id,
        expectedMoveIndex,
        receivedMoveIndex: parsed.data.moveIndex,
      })
      return c.json({ message: 'Moves must be logged sequentially' }, 409)
    }

    const expectedActor = expectedMoveIndex % 2 === 0 ? 'modelA' : 'modelB'
    if (parsed.data.actor !== expectedActor) {
      logger.warn('Move actor order invalid', {
        gameId: game.id,
        expectedActor,
        receivedActor: parsed.data.actor,
      })
      return c.json({ message: 'Invalid actor for move order' }, 409)
    }

    const positionTaken = existingMoves.some((moveRecord) => moveRecord.position === parsed.data.position)
    if (positionTaken) {
      logger.warn('Move position already used', { gameId: game.id, position: parsed.data.position })
      return c.json({ message: 'Position already occupied' }, 409)
    }

    const board = (game.boardState ?? []) as GameResource['board']
    const finalCellOwner = board[parsed.data.position]
    if (finalCellOwner === null) {
      logger.warn('Move position is empty in final board state', {
        gameId: game.id,
        position: parsed.data.position,
      })
      return c.json({ message: 'Final board state does not include this move' }, 409)
    }

    if (finalCellOwner !== parsed.data.actor) {
      logger.warn('Move actor does not match final board cell owner', {
        gameId: game.id,
        position: parsed.data.position,
        actor: parsed.data.actor,
        cellOwner: finalCellOwner,
      })
      return c.json({ message: 'Move actor mismatch for recorded board state' }, 409)
    }

    const occupiedCells = board.filter((cell) => cell !== null).length
    if (expectedMoveIndex >= occupiedCells) {
      logger.warn('Move count exceeds occupied board cells', {
        gameId: game.id,
        occupiedCells,
        attemptedIndex: expectedMoveIndex,
      })
      return c.json({ message: 'Move exceeds final board state' }, 409)
    }

    const trimmedReasoning = parsed.data.reasoning?.trim()
    const normalizedReasoning =
      trimmedReasoning && trimmedReasoning.length > 0
        ? trimmedReasoning.slice(0, MAX_REASONING_LENGTH)
        : undefined

    const moveRecord = await createMoveRecord(runtimeEnv, game.id, {
      ...parsed.data,
      reasoning: normalizedReasoning,
    })
    const move = toMoveResource(moveRecord)

    emitEvent('move:recorded', {
      gameId: move.gameId,
      moveId: move.id,
      moveIndex: move.moveIndex,
      position: move.position,
      actor: move.actor,
    })

    logger.info('Move recorded for game', { gameId: game.id, moveId: move.id })
    return c.json({ move }, 201)
  })
}
