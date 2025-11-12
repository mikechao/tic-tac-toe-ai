import { and, desc, eq } from 'drizzle-orm'

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

  // Get all model stats
  const stats = await db
    .select()
    .from(modelStats)
    .orderBy(desc(modelStats.lastUpdatedAt))

  // Transform to leaderboard entries
  const entries: LeaderboardEntry[] = []

  for (const stat of stats) {
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
        eq(recentMatches.modelVersion, stat.modelVersion),
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
        eq(recentMatches.modelVersion, stat.modelVersion),
      ))
      .orderBy(recentMatches.matchIndex)
      .limit(5)

    // Build recent form array (ordered from most recent to oldest)
    const recentForm = recentFormData
      .sort((a, b) => a.matchIndex - b.matchIndex)
      .map(match => match.result as "W" | "L" | "T")

    // Get last matchup info
    const lastMatchup = recentMatchesData[0] ? {
      opponentId: recentMatchesData[0].opponentModelId,
      result: recentMatchesData[0].result as "W" | "L" | "T",
      playedAt: recentMatchesData[0].playedAt.toISOString(),
    } : null

    // Calculate win rate
    const winRate = stat.totalMatches > 0 ? stat.wins / stat.totalMatches : 0

    entries.push({
      rank: null, // Will be set by sorting
      modelId: stat.modelId,
      matches: stat.totalMatches,
      wins: stat.wins,
      losses: stat.losses,
      ties: stat.ties,
      averageTurns: parseFloat(stat.averageTurns.toString()),
      winRate,
      streak: {
        type: stat.currentStreakType as any,
        length: stat.currentStreakLength,
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
  modelVersion?: string
): Promise<LeaderboardEntry | null> {
  const db = createDb(env)

  const whereClause = modelVersion
    ? and(eq(modelStats.modelId, modelId), eq(modelStats.modelVersion, modelVersion))
    : eq(modelStats.modelId, modelId)

  const [stat] = await db
    .select()
    .from(modelStats)
    .where(whereClause)
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
      eq(recentMatches.modelVersion, stat.modelVersion),
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
      eq(recentMatches.modelVersion, stat.modelVersion),
    ))
    .orderBy(recentMatches.matchIndex)
    .limit(5)

  // Build recent form array (ordered from most recent to oldest)
  const recentForm = recentFormData
    .sort((a, b) => a.matchIndex - b.matchIndex)
    .map(match => match.result as "W" | "L" | "T")

  // Get last matchup info
  const lastMatchup = recentMatchesData[0] ? {
    opponentId: recentMatchesData[0].opponentModelId,
    result: recentMatchesData[0].result as "W" | "L" | "T",
    playedAt: recentMatchesData[0].playedAt.toISOString(),
  } : null

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
      type: stat.currentStreakType as any,
      length: stat.currentStreakLength,
    },
    recentForm,
    lastMatchup,
  }
}