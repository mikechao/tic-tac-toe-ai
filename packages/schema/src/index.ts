import { z } from 'zod'

// Primitive identifiers shared across API contracts
export const modelIdSchema = z.number().int().positive()
export type ModelId = z.infer<typeof modelIdSchema>

export const matchIdSchema = z.number().int().positive()
export type MatchId = z.infer<typeof matchIdSchema>

export const totalRoundsSchema = z.number().int().min(1).max(100)
export type TotalRounds = z.infer<typeof totalRoundsSchema>

// Request payloads
export const createMatchRequestSchema = z
  .object({
    modelAId: modelIdSchema,
    modelBId: modelIdSchema,
    totalRounds: totalRoundsSchema,
  })
  .refine((payload) => payload.modelAId !== payload.modelBId, {
    message: 'modelAId and modelBId must reference different models',
    path: ['modelBId'],
  })

export type CreateMatchRequest = z.infer<typeof createMatchRequestSchema>

// Route params
export const matchParamsSchema = z.object({
  matchId: z.coerce.number().int().positive(),
})
export type MatchParams = z.infer<typeof matchParamsSchema>

// Resources shared with the frontend
export const matchResourceSchema = z.object({
  id: matchIdSchema,
  modelAId: modelIdSchema,
  modelBId: modelIdSchema,
  totalRounds: totalRoundsSchema,
  createdAt: z.string(),
})
export type MatchResource = z.infer<typeof matchResourceSchema>

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
