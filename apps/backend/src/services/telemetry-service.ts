import { type Database } from '../lib/db'
import { jsonRepairTelemetry } from '../../drizzle/schema'
import { createJsonRepairTelemetrySchema } from '@arena/schema'
import { eq, and, count } from 'drizzle-orm'
import { getModelIdFromLabel } from './model-registry'
import type { CreateJsonRepairTelemetry } from '@arena/schema'

export class TelemetryService {
  constructor(private db: Database) {}

  async recordRepairAttempt(telemetry: CreateJsonRepairTelemetry): Promise<void> {
    try {
      const validatedData = createJsonRepairTelemetrySchema.parse(telemetry)
      const modelId = getModelIdFromLabel(validatedData.modelLabel)

      await this.db.insert(jsonRepairTelemetry).values({
        modelId,
        roundId: validatedData.roundId || null,
        repairAttemptAt: new Date(validatedData.repairAttemptAt),
        originalJson: validatedData.originalText,
        repairedJson: validatedData.repairedJson || '',
        repairSuccessful: validatedData.success,
        repairDurationMs: Math.round(validatedData.processingTimeMs),
        repairSteps: validatedData.repairSteps,
        errorType: validatedData.errorType,
        errorDetails: validatedData.error,
      })
    } catch (error) {
      console.error('Failed to record repair telemetry:', error)
      // Don't throw - telemetry failures shouldn't break matches
    }
  }

  async getModelReliabilityStats(modelLabel: string): Promise<{
    jsonReliability: number
    repairAttempts: number
    repairSuccessRate: number
    totalMoves: number
  }> {
    try {
      const modelId = getModelIdFromLabel(modelLabel)

      const [totalResult, successfulResult] = await Promise.all([
        this.db.select({ count: count() }).from(jsonRepairTelemetry)
          .where(eq(jsonRepairTelemetry.modelId, modelId)),
        this.db.select({ count: count() }).from(jsonRepairTelemetry)
          .where(and(
            eq(jsonRepairTelemetry.modelId, modelId),
            eq(jsonRepairTelemetry.repairSuccessful, true)
          ))
      ])

      const totalAttempts = totalResult[0]?.count || 0
      const successfulRepairs = successfulResult[0]?.count || 0

      return {
        jsonReliability: totalAttempts > 0 ? (totalAttempts - successfulRepairs) / totalAttempts : 1.0,
        repairAttempts: totalAttempts,
        repairSuccessRate: totalAttempts > 0 ? successfulRepairs / totalAttempts : 0,
        totalMoves: 0, // Would need separate query from matches table if needed
      }
    } catch (error) {
      console.error('Failed to get model reliability stats:', error)
      return {
        jsonReliability: 1.0,
        repairAttempts: 0,
        repairSuccessRate: 0,
        totalMoves: 0,
      }
    }
  }
}