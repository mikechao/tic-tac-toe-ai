import {
  boolean,
  decimal,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  index,
} from 'drizzle-orm/pg-core'

const timestamptz = (name: string) => timestamp(name, { withTimezone: true })

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchId: uuid('match_id').notNull(),
    roundId: uuid('round_id').notNull().defaultRandom().unique(),
    playerOneModel: text('player_one_model').notNull(),
    playerTwoModel: text('player_two_model').notNull(),
    opponentType: text('opponent_type').notNull(),
    difficulty: text('difficulty'),
    boardSize: integer('board_size').notNull(),
    currentRound: integer('current_round').notNull(),
    totalRounds: integer('total_rounds').notNull(),
    startedAt: timestamptz('started_at').notNull(),
    finishedAt: timestamptz('finished_at').notNull(),
    rematchRequested: boolean('rematch_requested').notNull(),
    aiModelVersion: text('ai_model_version'),
    outcome: text('outcome').notNull(),
    winnerSlot: text('winner_slot').notNull(),
    durationMs: integer('duration_ms').notNull(),
    recapHash: text('recap_hash').notNull(),
    createdAt: timestamptz('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('matches_recap_hash_unique').on(table.recapHash),
    uniqueIndex('matches_match_round_unique').on(
      table.matchId,
      table.currentRound,
    ),
  ],
)

export const moves = pgTable(
  'moves',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roundId: uuid('round_id')
      .notNull()
      .references(() => matches.roundId, { onDelete: 'cascade' }),
    turnIndex: integer('turn_index').notNull(),
    cell: integer('cell').notNull(),
    symbol: text('symbol').notNull(),
    elapsedMs: integer('elapsed_ms').notNull(),
    createdAt: timestamptz('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('moves_round_turn_unique').on(table.roundId, table.turnIndex),
  ],
)

// Leaderboard summary tables
export const modelStats = pgTable(
  'model_stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    modelId: integer('model_id').notNull(),
    totalMatches: integer('total_matches').notNull().default(0),
    wins: integer('wins').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    ties: integer('ties').notNull().default(0),
    averageTurns: decimal('average_turns', { precision: 5, scale: 2 }).notNull().default('0.00'),
    currentStreakType: varchar('current_streak_type', { length: 10 }).notNull().default('win'), // 'win', 'loss', or 'tie'
    currentStreakLength: integer('current_streak_length').notNull().default(0),
    lastUpdatedAt: timestamptz('last_updated_at').notNull().defaultNow(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('model_stats_model_id_unique').on(table.modelId),
  ],
)

export const recentMatches = pgTable(
  'recent_matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    modelId: integer('model_id').notNull(),
    matchId: uuid('match_id').notNull(),
    roundId: uuid('round_id').notNull(),
    result: varchar('result', { length: 1 }).notNull(), // 'W', 'L', or 'T'
    opponentModelId: integer('opponent_model_id'), // nullable for human opponents
    playedAt: timestamptz('played_at').notNull(),
    matchIndex: integer('match_index').notNull(), // 1 = most recent, 5 = oldest
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('recent_matches_model_index_unique').on(table.modelId, table.matchIndex),
    uniqueIndex('recent_matches_model_match_unique').on(table.modelId, table.matchId, table.roundId),
  ],
)

export const jsonRepairTelemetry = pgTable(
  'json_repair_telemetry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    modelId: integer('model_id').notNull(),
    roundId: uuid('round_id').references(() => matches.roundId, { onDelete: 'cascade' }),
    repairAttemptAt: timestamptz('repair_attempt_at').notNull(),
    originalJson: text('original_json').notNull(),
    repairedJson: text('repaired_json').notNull(),
    repairSuccessful: boolean('repair_successful').notNull(),
    repairDurationMs: integer('repair_duration_ms').notNull(),
    repairSteps: text('repair_steps').array().notNull(),
    errorType: varchar('error_type', { length: 50 }),
    errorDetails: text('error_details'),
    createdAt: timestamptz('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('json_repair_telemetry_model_id_idx').on(table.modelId),
    index('json_repair_telemetry_round_id_idx').on(table.roundId),
    index('json_repair_telemetry_created_at_idx').on(table.createdAt),
  ]
)
