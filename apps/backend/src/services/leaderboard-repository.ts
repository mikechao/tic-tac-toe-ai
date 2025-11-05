import { desc, sql } from 'drizzle-orm'

import type { GameWinner } from '@arena/schema'

import type { Env } from '../env'
import { createDb } from '../lib/db'
import { leaderboardStats } from '../../drizzle/schema'
import type { MatchRecord } from './match-repository'
import type { LeaderboardResponse, LeaderboardEntry } from './schemas'

type LeaderboardDelta = {
  wins: number
  losses: number
  ties: number
}

async function applyDelta(
  env: Env,
  modelId: number,
  delta: LeaderboardDelta,
): Promise<void> {
  const db = createDb(env)
  await db
    .insert(leaderboardStats)
    .values({
      modelId,
      wins: delta.wins,
      losses: delta.losses,
      ties: delta.ties,
    })
    .onConflictDoUpdate({
      target: leaderboardStats.modelId,
      set: {
        wins: sql`${leaderboardStats.wins} + ${delta.wins}`,
        losses: sql`${leaderboardStats.losses} + ${delta.losses}`,
        ties: sql`${leaderboardStats.ties} + ${delta.ties}`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
}

export async function applyGameOutcomeToLeaderboard(
  env: Env,
  match: MatchRecord,
  winner: GameWinner,
): Promise<number[]> {
  if (winner === 'modelA') {
    await Promise.all([
      applyDelta(env, match.modelAId, { wins: 1, losses: 0, ties: 0 }),
      applyDelta(env, match.modelBId, { wins: 0, losses: 1, ties: 0 }),
    ])
  } else if (winner === 'modelB') {
    await Promise.all([
      applyDelta(env, match.modelAId, { wins: 0, losses: 1, ties: 0 }),
      applyDelta(env, match.modelBId, { wins: 1, losses: 0, ties: 0 }),
    ])
  } else {
    await Promise.all([
      applyDelta(env, match.modelAId, { wins: 0, losses: 0, ties: 1 }),
      applyDelta(env, match.modelBId, { wins: 0, losses: 0, ties: 1 }),
    ])
  }

  return [match.modelAId, match.modelBId]
}

function toLeaderboardEntry(
  record: typeof leaderboardStats.$inferSelect,
): LeaderboardEntry {
  const updatedAt =
    record.updatedAt instanceof Date
      ? record.updatedAt.toISOString()
      : new Date(record.updatedAt).toISOString()

  return {
    modelId: record.modelId,
    wins: record.wins,
    losses: record.losses,
    ties: record.ties,
    updatedAt,
  }
}

export async function getLeaderboard(env: Env): Promise<LeaderboardResponse> {
  const db = createDb(env)
  const rows = await db
    .select()
    .from(leaderboardStats)
    .orderBy(desc(leaderboardStats.wins), desc(leaderboardStats.updatedAt))
  return { entries: rows.map(toLeaderboardEntry) }
}
