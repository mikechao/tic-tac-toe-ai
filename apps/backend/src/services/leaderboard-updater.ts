import { eq, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { matches } from '../../drizzle/schema'
import { mapMatchToRecentResult, mapRecentResultToStreakType } from '@arena/schema/result-mapping'
import { getModelIdByName } from '@arena/schema/model-registry'

/**
 * Update leaderboard statistics after a match is completed
 * This should be called within the same transaction as match saving
 */
export async function updateLeaderboardForMatch(
  db: PostgresJsDatabase,
  matchId: string,
  roundId: string
): Promise<void> {
  // Debug logging
  console.log('updateLeaderboardForMatch called with:', { matchId, roundId })

  if (!roundId) {
    console.error('roundId is undefined in updateLeaderboardForMatch')
    throw new Error('roundId is required')
  }

  // Get the match that was just saved
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.matchId, matchId))
    .limit(1)

  if (!match) {
    throw new Error(`Match not found: ${matchId}`)
  }

  // Get move count for this round
  console.log('Querying move count for roundId:', roundId)
  let moveCountResult
  try {
    moveCountResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM moves WHERE round_id = ${roundId}`
    )
    console.log('Move count result:', moveCountResult)
  } catch (error) {
    console.error('Move count query error:', error)
    throw error
  }
  const moveCount = Number((moveCountResult as any)[0]?.count || 0)

  // Extract model IDs and versions from the match
  const player1ModelId = getModelIdByName(match.playerOneModel)
  const player2ModelId = getModelIdByName(match.playerTwoModel)

  // Update stats for both players if they're registered models
  if (player1ModelId) {
    const player1Version = match.aiModelVersion || match.playerOneModel
    await updateModelStats(db, match, player1ModelId, player1Version, moveCount, 'player1')
    await updateRecentMatches(db, match, player1ModelId, player1Version, player2ModelId, 'player1')
  }

  if (player2ModelId) {
    const player2Version = match.playerTwoModel
    await updateModelStats(db, match, player2ModelId, player2Version, moveCount, 'player2')
    await updateRecentMatches(db, match, player2ModelId, player2Version, player1ModelId, 'player2')
  }
}

/**
 * Update or create model statistics for a specific model
 */
async function updateModelStats(
  db: PostgresJsDatabase,
  match: typeof matches.$inferSelect,
  modelId: number,
  modelVersion: string,
  moveCount: number,
  perspective: 'player1' | 'player2'
): Promise<void> {
  const result = mapMatchToRecentResult(perspective, match.winnerSlot as any)
  const isWin = result === 'W'
  const isLoss = result === 'L'
  const isTie = result === 'T'

  // Use raw SQL for upsert operation since Drizzle doesn't handle composite unique constraints well
  await db.execute(sql`
    INSERT INTO model_stats (
      model_id, model_version, total_matches, wins, losses, ties, average_turns,
      current_streak_type, current_streak_length, last_updated_at
    ) VALUES (
      ${modelId}, ${modelVersion}, 1, ${isWin ? 1 : 0}, ${isLoss ? 1 : 0},
      ${isTie ? 1 : 0}, ${moveCount}, ${mapRecentResultToStreakType(result)}, 1, NOW()
    )
    ON CONFLICT (model_id, model_version) DO UPDATE SET
      total_matches = model_stats.total_matches + 1,
      wins = model_stats.wins + ${isWin ? 1 : 0},
      losses = model_stats.losses + ${isLoss ? 1 : 0},
      ties = model_stats.ties + ${isTie ? 1 : 0},
      average_turns = ROUND((model_stats.average_turns * model_stats.total_matches + ${moveCount}) / (model_stats.total_matches + 1), 2),
      current_streak_type = ${mapRecentResultToStreakType(result)},
      current_streak_length = CASE
        WHEN model_stats.current_streak_type = ${mapRecentResultToStreakType(result)}
        THEN model_stats.current_streak_length + 1
        ELSE 1
      END,
      last_updated_at = NOW()
  `)
}

/**
 * Update recent matches window for a model (keeps exactly 5 most recent)
 */
async function updateRecentMatches(
  db: PostgresJsDatabase,
  match: typeof matches.$inferSelect,
  modelId: number,
  modelVersion: string,
  opponentId: number | null,
  perspective: 'player1' | 'player2'
): Promise<void> {
  const result = mapMatchToRecentResult(perspective, match.winnerSlot as any)
  const opponentModelVersion = opponentId ? getOpponentModelVersion(match, opponentId) : null

  // Check if this match already exists to avoid unnecessary window operations
  const existingCheck = await db.execute(
    sql`SELECT id FROM recent_matches WHERE model_id = ${modelId} AND model_version = ${modelVersion} AND match_id = ${match.matchId} LIMIT 1`
  )

  // If match already exists, do nothing to preserve the exactly-5 invariant
  if (existingCheck.length > 0) {
    return
  }

  // Remove oldest match if we already have 5 (prevents unique constraint violation)
  await db.execute(
    sql`DELETE FROM recent_matches WHERE model_id = ${modelId} AND model_version = ${modelVersion} AND match_index = 5`
  )

  // Shift existing matches down (make room for new one at index 1)
  await db.execute(
    sql`UPDATE recent_matches SET match_index = match_index + 1 WHERE model_id = ${modelId} AND model_version = ${modelVersion} AND match_index <= 4`
  )

  // Insert new match as index 1 (most recent)
  console.log('Inserting recent match with data:', {
    modelId, modelVersion, matchId: match.matchId, roundId: match.roundId,
    result, opponentId, opponentModelVersion, playedAt: match.finishedAt
  })

  const insertQuery = sql`INSERT INTO recent_matches (
    model_id, model_version, match_id, round_id, result,
    opponent_model_id, opponent_model_version, played_at, match_index
  ) VALUES (
    ${modelId},
    ${modelVersion},
    ${match.matchId},
    ${match.roundId},
    ${result},
    ${opponentId},
    ${opponentModelVersion},
    ${match.finishedAt.toISOString()},
    1
  )`

  await db.execute(insertQuery)
}

/**
 * Helper function to extract opponent model version from match data
 */
function getOpponentModelVersion(
  match: typeof matches.$inferSelect,
  opponentId: number
): string | null {
  const opponentModelName = opponentId === getModelIdByName(match.playerOneModel)
    ? match.playerOneModel
    : match.playerTwoModel

  return opponentModelName || null
}