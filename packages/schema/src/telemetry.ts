import { z } from 'zod'

export const jsonRepairTelemetrySchema = z.object({
  id: z.string().uuid(),
  modelId: z.number().int(),
  roundId: z.string().uuid().nullable(),
  repairAttemptAt: z.string().datetime(),
  originalJson: z.string(),
  repairedJson: z.string(),
  repairSuccessful: z.boolean(),
  repairDurationMs: z.number().int(),
  repairSteps: z.array(z.string()),
  errorType: z.string().max(50).optional(),
  errorDetails: z.string().optional(),
  createdAt: z.string().datetime(),
})

export const createJsonRepairTelemetrySchema = jsonRepairTelemetrySchema.omit({
  id: true,
  createdAt: true,
  modelId: true,
  roundId: true,
  originalJson: true,
  repairSuccessful: true,
  repairDurationMs: true,
  errorDetails: true,
}).extend({
  modelLabel: z.string(),
  originalText: z.string(),
  processingTimeMs: z.number(),
  roundNumber: z.number(),
  provider: z.string(),
  success: z.boolean(),
  repairedJson: z.string().optional(),
  error: z.string().optional(),
  repairAttemptAt: z.string().datetime(),
  roundId: z.string().uuid().nullable().optional(),
})

export type JsonRepairTelemetry = z.infer<typeof jsonRepairTelemetrySchema>
export type CreateJsonRepairTelemetry = z.infer<typeof createJsonRepairTelemetrySchema>