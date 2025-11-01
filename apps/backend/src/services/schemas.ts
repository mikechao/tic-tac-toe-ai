import { z } from 'zod'

export const createMatchSchema = z.object({
  modelAId: z.number().int().positive(),
  modelBId: z.number().int().positive(),
  totalRounds: z.number().int().min(1).max(100),
})

export type CreateMatchPayload = z.infer<typeof createMatchSchema>
