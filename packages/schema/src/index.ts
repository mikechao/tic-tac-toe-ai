import { z } from 'zod'

// Primitive identifiers shared across API contracts
export const modelIdSchema = z.number().int().positive()
export type ModelId = z.infer<typeof modelIdSchema>

export const matchIdSchema = z.number().int().positive()
export type MatchId = z.infer<typeof matchIdSchema>

export const difficultySchema = z.enum(['easy', 'standard', 'hard'])
export type Difficulty = z.infer<typeof difficultySchema>

export const gameIdSchema = z.number().int().positive()
export type GameId = z.infer<typeof gameIdSchema>

export const moveIndexSchema = z.number().int().min(0).max(8)
export type MoveIndex = z.infer<typeof moveIndexSchema>

export const boardCellSchema = z.union([
  z.literal('modelA'),
  z.literal('modelB'),
  z.null(),
])
export type BoardCell = z.infer<typeof boardCellSchema>

export const boardStateSchema = z.array(boardCellSchema).length(9)
export type BoardState = z.infer<typeof boardStateSchema>

export const playerActorSchema = z.enum(['modelA', 'modelB'])
export type PlayerActor = z.infer<typeof playerActorSchema>

export const gameWinnerSchema = z.enum(['modelA', 'modelB', 'tie'])
export type GameWinner = z.infer<typeof gameWinnerSchema>

export const totalRoundsSchema = z.number().int().min(1).max(100)
export type TotalRounds = z.infer<typeof totalRoundsSchema>

// Request payloads
export const createMatchRequestSchema = z
  .object({
    modelAId: modelIdSchema,
    modelBId: modelIdSchema,
    difficulty: difficultySchema,
    totalRounds: totalRoundsSchema,
  })
  .refine((payload) => payload.modelAId !== payload.modelBId, {
    message: 'modelAId and modelBId must reference different models',
    path: ['modelBId'],
  })

export type CreateMatchRequest = z.infer<typeof createMatchRequestSchema>

export const createGameRequestSchema = z.object({
  round: z.number().int().min(1),
  winner: gameWinnerSchema,
  board: boardStateSchema,
})
export type CreateGameRequest = z.infer<typeof createGameRequestSchema>

export const createMoveRequestSchema = z.object({
  moveIndex: moveIndexSchema,
  position: z.number().int().min(0).max(8),
  actor: playerActorSchema,
  reasoning: z.string().min(1).max(5000).optional(),
})
export type CreateMoveRequest = z.infer<typeof createMoveRequestSchema>

// Route params
export const matchParamsSchema = z.object({
  matchId: z.coerce.number().int().positive(),
})
export type MatchParams = z.infer<typeof matchParamsSchema>

export const gameParamsSchema = z.object({
  gameId: z.coerce.number().int().positive(),
})
export type GameParams = z.infer<typeof gameParamsSchema>

// Resources shared with the frontend
export const matchResourceSchema = z.object({
  id: matchIdSchema,
  modelAId: modelIdSchema,
  modelBId: modelIdSchema,
  difficulty: difficultySchema,
  totalRounds: totalRoundsSchema,
  createdAt: z.string(),
})
export type MatchResource = z.infer<typeof matchResourceSchema>

export const matchStatusResourceSchema = matchResourceSchema.extend({
  completedGames: z.number().int().min(0),
  currentGameIndex: z.number().int().min(1),
  isComplete: z.boolean(),
})
export type MatchStatusResource = z.infer<typeof matchStatusResourceSchema>

export const gameResourceSchema = z.object({
  id: gameIdSchema,
  matchId: matchIdSchema,
  round: z.number().int().min(1),
  winner: gameWinnerSchema,
  board: boardStateSchema,
  createdAt: z.string(),
})
export type GameResource = z.infer<typeof gameResourceSchema>

export const moveResourceSchema = z.object({
  id: z.number().int().positive(),
  gameId: gameIdSchema,
  moveIndex: moveIndexSchema,
  position: z.number().int().min(0).max(8),
  actor: playerActorSchema,
  reasoning: z.string().optional(),
  createdAt: z.string(),
})
export type MoveResource = z.infer<typeof moveResourceSchema>

export const leaderboardEntrySchema = z.object({
  modelId: modelIdSchema,
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  ties: z.number().int().min(0),
  updatedAt: z.string(),
})
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>

export const leaderboardResponseSchema = z.object({
  entries: z.array(leaderboardEntrySchema),
})
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>

export const matchListResponseSchema = z.object({
  matches: z.array(matchResourceSchema),
})
export type MatchListResponse = z.infer<typeof matchListResponseSchema>
