import { eq } from 'drizzle-orm'

import type { CreateMatchRequest } from '@arena/schema'

import type { Env } from '../env'
import { createDb } from '../lib/db'
import { matches } from '../drizzle/schema'

export type CreateMatchInput = CreateMatchRequest

export async function createMatchRecord(env: Env, input: CreateMatchInput) {
  const db = createDb(env)
  const [record] = await db
    .insert(matches)
    .values({
      modelAId: input.modelAId,
      modelBId: input.modelBId,
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
