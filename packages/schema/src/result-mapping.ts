import type { DbMatchOutcome, MatchResult, RecentResult, StreakType } from './index'

/**
 * Convert match outcome to recent form result from model's perspective
 * @param modelPerspective - Which player the model was in this match
 * @param winnerSlot - Which player won the match ('player1'|'player2'|'draw')
 * @returns 'W'|'L'|'T' for UI display
 */
export function mapMatchToRecentResult(
  modelPerspective: 'player1' | 'player2',
  winnerSlot: 'player1' | 'player2' | 'draw'
): RecentResult {
  if (winnerSlot === 'draw') return 'T'

  const modelWon = (modelPerspective === 'player1' && winnerSlot === 'player1') ||
                   (modelPerspective === 'player2' && winnerSlot === 'player2')

  return modelWon ? 'W' : 'L'
}

/**
 * Convert recent form result back to database match outcome
 * @param recentResult - 'W'|'L'|'T' from UI perspective
 * @param modelPerspective - Which player the model was in this match
 * @returns Complete database record with validated DbMatchOutcome
 */
export function mapRecentResultToMatchOutcome(
  recentResult: RecentResult,
  modelPerspective: 'player1' | 'player2'
): {
  outcome: DbMatchOutcome // Only 'win'|'draw' - validated type
  winnerSlot: 'player1' | 'player2' | 'draw'
} {
  switch (recentResult) {
    case 'W': return {
      outcome: 'win', // All completed matches store 'win' in outcome column
      winnerSlot: modelPerspective === 'player1' ? 'player1' : 'player2'
    }
    case 'L': return {
      outcome: 'win', // All completed matches store 'win' in outcome column
      winnerSlot: modelPerspective === 'player1' ? 'player2' : 'player1'
    }
    case 'T': return {
      outcome: 'draw', // Only ties store 'draw' in outcome column
      winnerSlot: 'draw'
    }
  }
}

/**
 * Convert database match outcome to streak type for business logic
 * @param dbOutcome - Database outcome ('win'|'draw')
 * @returns Streak type ('win'|'loss'|'tie')
 */
export function mapDbOutcomeToStreakType(dbOutcome: DbMatchOutcome): StreakType {
  return dbOutcome === 'draw' ? 'tie' : 'win' // Database never stores 'loss'
}

/**
 * Convert recent result to streak type for business logic
 * @param recentResult - 'W'|'L'|'T' from UI
 * @returns Streak type ('win'|'loss'|'tie')
 */
export function mapRecentResultToStreakType(recentResult: RecentResult): StreakType {
  switch (recentResult) {
    case 'W': return 'win'
    case 'L': return 'loss'
    case 'T': return 'tie'
  }
}

/**
 * Get inverse result for opponent calculations
 * @param result - Current model's result
 * @returns Opponent's result
 */
export function getOpponentResult(result: RecentResult): RecentResult {
  switch (result) {
    case 'W': return 'L'
    case 'L': return 'W'
    case 'T': return 'T'
  }
}

/**
 * Convert recent form result to MatchResult from model's perspective for API responses
 * This function synthesizes 'loss' values that don't exist in database storage
 * @param recentResult - 'W'|'L'|'T' from stored recent_matches table
 * @returns MatchResult ('win'|'loss'|'draw') from the model's perspective
 */
export function mapRecentResultToMatchResult(recentResult: RecentResult): MatchResult {
  switch (recentResult) {
    case 'W': return 'win'
    case 'L': return 'loss'
    case 'T': return 'draw'
  }
}