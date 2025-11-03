import { count, eq } from 'drizzle-orm'

import type { CreateMatchRequest } from '@arena/schema'

import type { Env } from '../env'
import { createDb } from '../lib/db'
import { games, matches } from '../../drizzle/schema'

export type CreateMatchInput = CreateMatchRequest
export type MatchRecord = typeof matches.$inferSelect

export async function createMatchRecord(env: Env, input: CreateMatchInput) {
  const db = createDb(env)
  const [record] = await db
    .insert(matches)
    .values({
      modelAId: input.modelAId,
      modelBId: input.modelBId,
      difficulty: input.difficulty,
      totalRounds: input.totalRounds,
    })
    .returning()

  return record
}

export async function findMatchById(env: Env, matchId: number) {
  const db = createDb(env)
  const [record] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1)

  return record ?? null
}

export async function countGamesForMatch(env: Env, matchId: number): Promise<number> {
  const db = createDb(env)
  const [result] = await db
    .select({ value: count() })
    .from(games)
    .where(eq(games.matchId, matchId))

  const value = result?.value ?? 0
  return typeof value === 'bigint' ? Number(value) : value
}
