import type { BoardCell } from '@arena/schema'
import { integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const models = pgTable('models', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  provider: text('provider').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  modelAId: integer('model_a_id').notNull().references(() => models.id),
  modelBId: integer('model_b_id').notNull().references(() => models.id),
  difficulty: text('difficulty').notNull(),
  totalRounds: integer('total_rounds').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const games = pgTable(
  'games',
  {
    id: serial('id').primaryKey(),
    matchId: integer('match_id').notNull().references(() => matches.id),
    round: integer('round').notNull(),
    winner: text('winner').notNull(),
    boardState: jsonb('board_state').$type<BoardCell[]>().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    matchRoundUnique: uniqueIndex('games_match_round_unique').on(table.matchId, table.round),
  })
)

export const moves = pgTable(
  'moves',
  {
    id: serial('id').primaryKey(),
    gameId: integer('game_id').notNull().references(() => games.id),
    moveIndex: integer('move_index').notNull(),
    position: integer('position').notNull(),
    actor: text('actor').notNull(),
    reasoning: text('reasoning'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    moveIndexUnique: uniqueIndex('moves_game_move_idx_unique').on(table.gameId, table.moveIndex),
    movePositionUnique: uniqueIndex('moves_game_position_unique').on(table.gameId, table.position),
  })
)

export const leaderboardStats = pgTable('leaderboard_stats', {
  id: serial('id').primaryKey(),
  modelId: integer('model_id').notNull().references(() => models.id).unique(),
  wins: integer('wins').default(0).notNull(),
  losses: integer('losses').default(0).notNull(),
  ties: integer('ties').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
