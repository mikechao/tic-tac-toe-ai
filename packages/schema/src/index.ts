import { z } from 'zod'

export const modelIdSchema = z.number().int().min(1)
export type ModelId = z.infer<typeof modelIdSchema>

// Database storage types (actual persisted values)
export const dbMatchOutcomeSchema = z.enum(['win', 'draw']) // Only values stored in matches.outcome
export const recentResultSchema = z.enum(['W', 'L', 'T']) // Values stored in recent_matches.result

// API and business logic types (derived values)
export const matchResultSchema = z.enum(['win', 'loss', 'draw']) // Full set for API responses
export const streakTypeSchema = z.enum(['win', 'loss', 'tie'])

// Type exports
export type DbMatchOutcome = z.infer<typeof dbMatchOutcomeSchema>
export type RecentResult = z.infer<typeof recentResultSchema>
export type MatchResult = z.infer<typeof matchResultSchema> // API response type
export type StreakType = z.infer<typeof streakTypeSchema>

export const roundMoveSchema = z.object({
  turnIndex: z.number().int().nonnegative(),
  cell: z.number().int().nonnegative(),
  symbol: z.enum(['X', 'O']),
  elapsedMs: z.number().int().min(0),
})
export type RoundMove = z.infer<typeof roundMoveSchema>

export const roundResultSchema = z.object({
  matchId: z.string().uuid().optional(),
  roundId: z.string().uuid().optional(),
  playerOneModel: z.string().min(1).max(128).nullable(),
  playerTwoModel: z.string().min(1).max(128).nullable(),
  boardSize: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  currentRound: z.number().int().min(1),
  totalRounds: z.number().int().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  startedAt: z.string(),
  finishedAt: z.string(),
  durationMs: z.number().int().min(0),
  outcome: z.enum(['win', 'loss', 'draw']),
  winner: z.enum(['player1', 'player2', 'draw']),
  moves: z.array(roundMoveSchema),
  rematchRequested: z.boolean(),
})
export type RoundResult = z.infer<typeof roundResultSchema>

export const roundResultResponseSchema = z.object({
  matchId: z.string().uuid(),
  roundId: z.string().uuid(),
  moveCount: z.number().int().min(0),
  persistedAt: z.string(),
  idempotent: z.boolean(),
})
export type RoundResultResponse = z.infer<typeof roundResultResponseSchema>

// Database table schemas
export const modelStatsSchema = z.object({
  id: z.string().uuid(),
  modelId: z.number().int(),
  modelVersion: z.string().min(1),
  totalMatches: z.number().int().min(0),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  ties: z.number().int().min(0),
  averageTurns: z.number().min(0),
  currentStreakType: streakTypeSchema,
  currentStreakLength: z.number().int().min(0),
  lastUpdatedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
})

export const recentMatchesSchema = z.object({
  id: z.string().uuid(),
  modelId: z.number().int(),
  modelVersion: z.string().min(1),
  matchId: z.string().uuid(),
  roundId: z.string().uuid(),
  result: recentResultSchema,
  opponentModelId: z.number().int().nullable(),
  opponentModelVersion: z.string().nullable(),
  playedAt: z.string().datetime(),
  matchIndex: z.number().int().positive(),
  createdAt: z.string().datetime(),
})

// API response schemas
export const leaderboardEntrySchema = z.object({
  rank: z.number().int().positive().nullable(),
  modelId: z.number().int(),
  matches: z.number().int().min(0),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  ties: z.number().int().min(0),
  averageTurns: z.number().min(0),
  winRate: z.number().min(0).max(1),
  streak: z.object({
    type: streakTypeSchema,
    length: z.number().int().min(0),
  }),
  recentForm: z.array(recentResultSchema).max(5), // Up to 5 entries (pad for new models),
  lastMatchup: z.object({
    opponentId: z.number().int().nullable(), // Nullable for models with no opponents yet
    result: recentResultSchema.nullable(), // Nullable when no opponent exists
    playedAt: z.string().datetime().nullable(), // Nullable when no opponent exists
  }).nullable(), // Entire object nullable for models with no match history
})

export const leaderboardResponseSchema = z.object({
  entries: z.array(leaderboardEntrySchema),
  lastUpdated: z.string().datetime(),
  totalModels: z.number().int().min(0),
})

// Type exports for schemas
export type ModelStats = z.infer<typeof modelStatsSchema>
export type RecentMatches = z.infer<typeof recentMatchesSchema>
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>

// Runtime validation helpers
export function assertValidDbMatchOutcome(value: unknown): asserts value is DbMatchOutcome {
  dbMatchOutcomeSchema.parse(value)
}

export function isValidDbMatchOutcome(value: unknown): value is DbMatchOutcome {
  return dbMatchOutcomeSchema.safeParse(value).success
}
