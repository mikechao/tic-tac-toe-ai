import { and, eq, sql } from 'drizzle-orm'

import type { Env } from '../env'
import { createDb } from '../lib/db'
import { modelStats, recentMatches } from '../../drizzle/schema'
import { sortLeaderboardEntries } from '@arena/schema/ranking'
import type { LeaderboardEntry, LeaderboardResponse } from '@arena/schema'

/**
 * Get complete leaderboard data from summary tables
 */
export async function getLeaderboard(env: Env): Promise<LeaderboardResponse> {
  const db = createDb(env)

  // Get aggregated stats by modelId (ignoring model_version)
  const aggregatedStats = await db.execute(sql`
    SELECT
      model_id,
      SUM(total_matches) as total_matches,
      SUM(wins) as wins,
      SUM(losses) as losses,
      SUM(ties) as ties,
      ROUND(AVG(CAST(average_turns AS NUMERIC)), 2) as average_turns,
      MAX(last_updated_at) as last_updated_at
    FROM model_stats
    GROUP BY model_id
    ORDER BY MAX(last_updated_at) DESC
  `)

  type AggregatedStatsRow = {
    model_id: number
    total_matches: number
    wins: number
    losses: number
    ties: number
    average_turns: number | string
    last_updated_at: Date
  }

  const aggregatedRows: AggregatedStatsRow[] = (
    'rows' in aggregatedStats ? aggregatedStats.rows : aggregatedStats
  ) as AggregatedStatsRow[]

  // Transform to leaderboard entries
  const entries: LeaderboardEntry[] = []

  for (const stat of aggregatedRows) {
    // Get recent matches for this model (any version)
    const recentMatchesData = await db
      .select({
        result: recentMatches.result,
        opponentModelId: recentMatches.opponentModelId,
        playedAt: recentMatches.playedAt,
      })
      .from(recentMatches)
      .where(and(
        eq(recentMatches.modelId, stat.model_id as number),
        eq(recentMatches.matchIndex, 1) // Only get the most recent (index 1) for last matchup
      ))
      .limit(1)

    // Get all recent form matches (indices 1-5) ordered by most recent
    const recentFormData = await db
      .select({
        result: recentMatches.result,
        matchIndex: recentMatches.matchIndex,
      })
      .from(recentMatches)
      .where(and(
        eq(recentMatches.modelId, stat.model_id as number),
      ))
      .orderBy(recentMatches.matchIndex)
      .limit(5)

    // Build recent form array (ordered from most recent to oldest)
    const recentForm = recentFormData
      .sort((a, b) => a.matchIndex - b.matchIndex)
      .map(match => match.result as 'W' | 'L' | 'T')

    // Get last matchup info
    const lastMatchup = recentMatchesData[0]
      ? {
          opponentId: recentMatchesData[0].opponentModelId,
          result: recentMatchesData[0].result as 'W' | 'L' | 'T',
          playedAt: recentMatchesData[0].playedAt.toISOString(),
        }
      : null

    // Calculate win rate
    const winRate = stat.total_matches > 0 ? stat.wins / stat.total_matches : 0

    entries.push({
      rank: null, // Will be set by sorting
      modelId: stat.model_id,
      matches: stat.total_matches,
      wins: stat.wins,
      losses: stat.losses,
      ties: stat.ties,
      averageTurns: Number(stat.average_turns),
      winRate,
      streak: {
        type: 'win', // Default streak type since we're aggregating
        length: 0, // Default streak length since we're aggregating
      },
      recentForm,
      lastMatchup,
    })
  }

  // Sort entries and assign ranks
  const sortedEntries = sortLeaderboardEntries(entries)

  return {
    entries: sortedEntries,
    lastUpdated: new Date().toISOString(),
    totalModels: entries.length,
  }
}

/**
 * Get leaderboard data for a specific model
 */
export async function getModelLeaderboardEntry(
  env: Env,
  modelId: number,
  _modelVersion?: string
): Promise<LeaderboardEntry | null> {
  const db = createDb(env)

  const [stat] = await db
    .select()
    .from(modelStats)
    .where(eq(modelStats.modelId, modelId))
    .limit(1)

  if (!stat) {
    return null
  }

  // Get recent matches for this model/version
  const recentMatchesData = await db
    .select({
      result: recentMatches.result,
      opponentModelId: recentMatches.opponentModelId,
      playedAt: recentMatches.playedAt,
    })
    .from(recentMatches)
    .where(and(
      eq(recentMatches.modelId, stat.modelId),
      eq(recentMatches.matchIndex, 1) // Only get the most recent (index 1) for last matchup
    ))
    .limit(1)

  // Get all recent form matches (indices 1-5) ordered by most recent
  const recentFormData = await db
    .select({
      result: recentMatches.result,
      matchIndex: recentMatches.matchIndex,
    })
    .from(recentMatches)
    .where(and(
      eq(recentMatches.modelId, stat.modelId),
    ))
    .orderBy(recentMatches.matchIndex)
    .limit(5)

  // Build recent form array (ordered from most recent to oldest)
  const recentForm = recentFormData
    .sort((a, b) => a.matchIndex - b.matchIndex)
    .map(match => match.result as 'W' | 'L' | 'T')

  // Get last matchup info
  const lastMatchup = recentMatchesData[0]
    ? {
        opponentId: recentMatchesData[0].opponentModelId,
        result: recentMatchesData[0].result as 'W' | 'L' | 'T',
        playedAt: recentMatchesData[0].playedAt.toISOString(),
      }
    : null

  // Calculate win rate
  const winRate = stat.totalMatches > 0 ? stat.wins / stat.totalMatches : 0

  return {
    rank: null, // Will be calculated when part of full leaderboard
    modelId: stat.modelId,
    matches: stat.totalMatches,
    wins: stat.wins,
    losses: stat.losses,
    ties: stat.ties,
    averageTurns: parseFloat(stat.averageTurns.toString()),
    winRate,
      streak: {
        type: stat.currentStreakType as 'win' | 'loss' | 'tie',
        length: stat.currentStreakLength,
      },
    recentForm,
    lastMatchup,
  }
}
