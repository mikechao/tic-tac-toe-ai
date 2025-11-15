import { and, eq, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { matches } from '../../drizzle/schema'
import { mapMatchToRecentResult, mapRecentResultToStreakType } from '@arena/schema/result-mapping'
import { getModelIdByName } from '@arena/schema/model-registry'

type WinnerSlot = 'player1' | 'player2' | 'draw'

function toWinnerSlot(winnerSlot: string): WinnerSlot {
  if (winnerSlot === 'player1' || winnerSlot === 'player2' || winnerSlot === 'draw') {
    return winnerSlot
  }

  return 'draw'
}

/**
 * Update leaderboard statistics after a match is completed
 * This should be called within the same transaction as match saving
 */
export async function updateLeaderboardForMatch(
  db: PostgresJsDatabase,
  matchId: string,
  roundId: string
): Promise<void> {
  
  if (!roundId) {
    throw new Error('roundId is required')
  }

  // Get the specific round that was just saved
  const [match] = await db
    .select()
    .from(matches)
    .where(and(eq(matches.matchId, matchId), eq(matches.roundId, roundId)))
    .limit(1)

  if (!match) {
    throw new Error(`Match not found: ${matchId}`)
  }

  // Get move count for this round
  type MoveCountRow = { count: number | string }
  let moveCountResult: MoveCountRow[] = []
  try {
    moveCountResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM moves WHERE round_id = ${roundId}`
    )
    console.log('Move count result:', moveCountResult)
  } catch (error) {
    console.error('Move count query error:', error)
    throw error
  }
  const moveCount = Number(moveCountResult[0]?.count ?? 0)

  // Extract model IDs and versions from the match
  // Now using clean base names directly from frontend
  const player1ModelId = getModelIdByName(match.playerOneModel || '')
  const player2ModelId = getModelIdByName(match.playerTwoModel || '')

  // Update stats for both players if they're registered models
  if (player1ModelId) {
    await updateModelStats(db, match, player1ModelId, moveCount, 'player1')
    await updateRecentMatches(db, match, player1ModelId, player2ModelId, 'player1')
  }

  if (player2ModelId) {
    await updateModelStats(db, match, player2ModelId, moveCount, 'player2')
    await updateRecentMatches(db, match, player2ModelId, player1ModelId, 'player2')
  }
}

/**
 * Update or create model statistics for a specific model
 */
async function updateModelStats(
  db: PostgresJsDatabase,
  match: typeof matches.$inferSelect,
  modelId: number,
  moveCount: number,
  perspective: 'player1' | 'player2'
): Promise<void> {
  const winnerSlot = toWinnerSlot(match.winnerSlot)
  const result = mapMatchToRecentResult(perspective, winnerSlot)
  const isWin = result === 'W'
  const isLoss = result === 'L'
  const isTie = result === 'T'

  // Use raw SQL for upsert operation since Drizzle doesn't handle unique constraints well
  await db.execute(sql`
    INSERT INTO model_stats (
      model_id, total_matches, wins, losses, ties, average_turns,
      current_streak_type, current_streak_length, last_updated_at
    ) VALUES (
      ${modelId}, 1, ${isWin ? 1 : 0}, ${isLoss ? 1 : 0},
      ${isTie ? 1 : 0}, ${moveCount}, ${mapRecentResultToStreakType(result)}, 1, NOW()
    )
    ON CONFLICT (model_id) DO UPDATE SET
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
  opponentId: number | null,
  perspective: 'player1' | 'player2'
): Promise<void> {
  console.log('updateRecentMatches called with:', {
    modelId,
    opponentId,
    perspective,
    matchId: match.matchId,
    roundId: match.roundId
  })

  if (!match.matchId || !match.roundId) {
    console.error('Missing required match properties:', {
      matchId: match.matchId,
      roundId: match.roundId
    })
    throw new Error('Match must have matchId and roundId')
  }

  const winnerSlot = toWinnerSlot(match.winnerSlot)
  const result = mapMatchToRecentResult(perspective, winnerSlot)

  // Check if this specific round already exists to avoid unnecessary window operations
  console.log('Checking for existing round with:', { modelId, matchId: match.matchId, roundId: match.roundId })
  const existingCheck = await db.execute(
    sql`SELECT id FROM recent_matches WHERE model_id = ${modelId} AND match_id = ${match.matchId} AND round_id = ${match.roundId} LIMIT 1`
  )

  // If match already exists, do nothing to preserve the exactly-5 invariant
  if (existingCheck.length > 0) {
    return
  }

  // To keep an exact 5-round window, shift all existing indices and drop anything beyond 5
  try {
    await db.execute(sql`
      UPDATE recent_matches
      SET match_index = match_index + 1
      WHERE model_id = ${modelId}
    `)

    await db.execute(sql`
      DELETE FROM recent_matches
      WHERE model_id = ${modelId} AND match_index > 5
    `)
  } catch (error) {
    console.error('Error while normalizing match_index window:', error)
    throw error
  }

  const targetMatchIndex = 1

  // Insert new match with calculated index
  console.log('Inserting recent match with data:', {
    modelId, matchId: match.matchId, roundId: match.roundId,
    result, opponentId, playedAt: match.finishedAt, matchIndex: targetMatchIndex
  })

  try {
    const insertQuery = sql`INSERT INTO recent_matches (
      model_id, match_id, round_id, result,
      opponent_model_id, played_at, match_index
    ) VALUES (
      ${modelId},
      ${match.matchId},
      ${match.roundId},
      ${result},
      ${opponentId},
      ${match.finishedAt.toISOString()},
      ${targetMatchIndex}
    )`

    await db.execute(insertQuery)
    console.log('INSERT operation completed successfully')
  } catch (error) {
    console.error('Error in INSERT operation:', error)

    // Check if this is a constraint violation and attempt recovery
    if (error && typeof error === 'object' && 'code' in error) {
      const pgError = error as { code?: string; detail?: string }
      if (pgError.code === '23505') {
        console.log('Constraint violation detected, attempting recovery...')
        console.log('Constraint detail:', pgError.detail)

        // Try to clean up and retry once more
        try {
          await db.execute(sql`
            WITH ranked_matches AS (
              SELECT id, ROW_NUMBER() OVER (ORDER BY played_at DESC) as rn
              FROM recent_matches WHERE model_id = ${modelId}
            ),
            matches_to_delete AS (
              SELECT id FROM ranked_matches WHERE rn > 4
            )
            DELETE FROM recent_matches WHERE id IN (SELECT id FROM matches_to_delete);
          `)

          // Retry the insert
          await db.execute(sql`INSERT INTO recent_matches (
            model_id, match_id, round_id, result,
            opponent_model_id, played_at, match_index
          ) VALUES (
            ${modelId},
            ${match.matchId},
            ${match.roundId},
            ${result},
            ${opponentId},
            ${match.finishedAt.toISOString()},
            1
          )`)
          console.log('Recovery INSERT operation completed successfully')
        } catch (recoveryError) {
          console.error('Recovery attempt failed:', recoveryError)
          throw recoveryError
        }
      } else {
        throw error
      }
    } else {
      throw error
    }
  }
}
