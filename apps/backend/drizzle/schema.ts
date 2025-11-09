import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const timestamptz = (name: string) => timestamp(name, { withTimezone: true })

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roundId: uuid('round_id').notNull().defaultRandom(),
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
    uniqueIndex('matches_round_id_unique').on(table.roundId),
    uniqueIndex('matches_recap_hash_unique').on(table.recapHash),
  ],
)

export const moves = pgTable(
  'moves',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
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
    uniqueIndex('moves_match_turn_unique').on(table.matchId, table.turnIndex),
  ],
)
