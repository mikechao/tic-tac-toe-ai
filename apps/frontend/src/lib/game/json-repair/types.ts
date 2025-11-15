import { z } from 'zod'
import { moveResponseSchema } from '../ai-turn'

export interface JsonRepairResult {
  success: boolean
  data?: z.infer<typeof moveResponseSchema>
  error?: string
  repairSteps: string[]
  originalText?: string
  repairedJson?: string
  processingTimeMs?: number
}

export interface JsonRepairTelemetry {
  provider: 'transformers-js' // Only Transformers.js needs repair (Gemini Nano uses generateObject)
  repairSteps: string[]
  success: boolean
  errorType?: string
  error?: string
  processingTimeMs: number
  originalLength: number
  repairedLength?: number
  roundNumber: number
  modelLabel: string
  roundId?: string
  originalText?: string
  repairedJson?: string
}

export interface JsonRepairModule {
  jsonrepair: (text: string) => string
}