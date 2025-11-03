import { and, asc, eq } from 'drizzle-orm'

import type { CreateGamePayload, CreateMovePayload } from './schemas'

import type { Env } from '../env'
import { createDb } from '../lib/db'
import { games, moves } from '../../drizzle/schema'

export type GameRecord = typeof games.$inferSelect
export type MoveRecord = typeof moves.$inferSelect

export async function createGameRecord(env: Env, matchId: number, input: CreateGamePayload): Promise<GameRecord> {
  const db = createDb(env)
  const [record] = await db
    .insert(games)
    .values({
      matchId,
      round: input.round,
      winner: input.winner,
      boardState: input.board,
    })
    .returning()

  return record
}

export async function findGameById(env: Env, gameId: number): Promise<GameRecord | null> {
  const db = createDb(env)
  const [record] = await db.select().from(games).where(eq(games.id, gameId)).limit(1)
  return record ?? null
}

export async function findGameByMatchAndRound(
  env: Env,
  matchId: number,
  round: number
): Promise<GameRecord | null> {
  const db = createDb(env)
  const [record] = await db
    .select()
    .from(games)
    .where(and(eq(games.matchId, matchId), eq(games.round, round)))
    .limit(1)
  return record ?? null
}

export async function listMovesForGame(env: Env, gameId: number): Promise<MoveRecord[]> {
  const db = createDb(env)
  return db.select().from(moves).where(eq(moves.gameId, gameId)).orderBy(asc(moves.moveIndex))
}

export async function createMoveRecord(
  env: Env,
  gameId: number,
  input: CreateMovePayload
): Promise<MoveRecord> {
  const db = createDb(env)
  const [record] = await db
    .insert(moves)
    .values({
      gameId,
      moveIndex: input.moveIndex,
      position: input.position,
      actor: input.actor,
      reasoning: input.reasoning,
    })
    .returning()

  return record
}
