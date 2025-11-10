import { z } from 'zod'

export const modelIdSchema = z.number().int().min(1)
export type ModelId = z.infer<typeof modelIdSchema>

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
