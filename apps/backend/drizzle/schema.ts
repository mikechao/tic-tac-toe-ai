import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const models = pgTable('models', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  provider: text('provider').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  modelAId: integer('model_a_id').notNull().references(() => models.id),
  modelBId: integer('model_b_id').notNull().references(() => models.id),
  totalRounds: integer('total_rounds').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const games = pgTable('games', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull().references(() => sessions.id),
  round: integer('round').notNull(),
  winner: text('winner'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const moves = pgTable('moves', {
  id: serial('id').primaryKey(),
  gameId: integer('game_id').notNull().references(() => games.id),
  moveIndex: integer('move_index').notNull(),
  position: integer('position').notNull(),
  actor: text('actor').notNull(),
  reasoning: text('reasoning'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
