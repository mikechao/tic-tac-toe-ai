import { moveResponseSchema } from '../ai-turn'
import { trackRepairTelemetry } from './telemetry'
import { repairJsonAsync } from './loader'
import { extractFromPlainText } from './plain-text-extractor'
import { JSON_REPAIR_ENABLED } from './config'
import type { JsonRepairResult, JsonRepairTelemetry } from './types'

export async function attemptJsonRepair(
  text: string,
  baseTelemetry: JsonRepairTelemetry
): Promise<JsonRepairResult> {
  const startTime = performance.now()
  const steps: string[] = []
  const originalText = text

  try {
    // Quick disable without redeploy
    if (!JSON_REPAIR_ENABLED) {
      return attemptOriginalParse(text)
    }

    // Step 1: Extract JSON using existing patterns from ai-turn.ts
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                     text.match(/(\{[\s\S]*\})/)
    steps.push('json-extraction')

    const jsonText = jsonMatch ? jsonMatch[1] : text

    // Step 2: Try direct parsing (fast path)
    try {
      const parsed = JSON.parse(jsonText)
      const validated = moveResponseSchema.parse(parsed)

      const telemetry = {
        ...baseTelemetry,
        repairSteps: [...steps, 'direct-parse-success'],
        success: true as const,
        processingTimeMs: performance.now() - startTime,
        originalLength: text.length,
        repairedLength: jsonText.length
      }

      trackRepairTelemetry(telemetry)

      return {
        success: true,
        data: validated,
        repairSteps: telemetry.repairSteps,
        originalText,
        processingTimeMs: telemetry.processingTimeMs
      }
    } catch {
      steps.push('direct-parse-failed')
    }

    // Step 3: Attempt repair with timeout
    try {
      const repairedJson = await repairJsonAsync(jsonText, 100)
      const parsed = JSON.parse(repairedJson)
      const validated = moveResponseSchema.parse(parsed)

      const telemetry = {
        ...baseTelemetry,
        repairSteps: [...steps, 'jsonrepair-success'],
        success: true as const,
        processingTimeMs: performance.now() - startTime,
        originalLength: text.length,
        repairedLength: repairedJson.length
      }

      trackRepairTelemetry(telemetry)

      return {
        success: true,
        data: validated,
        repairSteps: telemetry.repairSteps,
        originalText,
        repairedJson,
        processingTimeMs: telemetry.processingTimeMs
      }
    } catch {
      steps.push('jsonrepair-failed')
    }

    // Step 4: Plain text extraction fallback
    const plainTextResult = extractFromPlainText(text)
    if (plainTextResult.success) {
      const telemetry = {
        ...baseTelemetry,
        repairSteps: [...steps, 'plain-text-extraction'],
        success: true as const,
        processingTimeMs: performance.now() - startTime,
        originalLength: text.length
      }

      trackRepairTelemetry(telemetry)

      return {
        ...plainTextResult,
        repairSteps: telemetry.repairSteps,
        originalText,
        processingTimeMs: telemetry.processingTimeMs
      }
    }

    // Step 5: Complete failure
    steps.push('complete-failure')

    const telemetry = {
      ...baseTelemetry,
      repairSteps: steps,
      success: false as const,
      errorType: 'complete-failure',
      processingTimeMs: performance.now() - startTime,
      originalLength: text.length
    }

    trackRepairTelemetry(telemetry)

    return {
      success: false,
      error: 'All JSON repair attempts failed',
      repairSteps: steps,
      originalText,
      processingTimeMs: telemetry.processingTimeMs
    }

  } catch (error) {
    const telemetry = {
      ...baseTelemetry,
      repairSteps: [...steps, 'unexpected-error'],
      success: false as const,
      errorType: 'unexpected-error',
      processingTimeMs: performance.now() - startTime,
      originalLength: text.length
    }

    trackRepairTelemetry(telemetry)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error',
      repairSteps: telemetry.repairSteps,
      originalText,
      processingTimeMs: telemetry.processingTimeMs
    }
  }
}

function attemptOriginalParse(text: string): JsonRepairResult {
  // Fallback to existing parsing without repair
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                   text.match(/(\{[\s\S]*\})/)

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      const validated = moveResponseSchema.parse(parsed)
      return { success: true, data: validated, repairSteps: ['original-parse'] }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Parse error', repairSteps: ['original-failed'] }
    }
  }

  return { success: false, error: 'No JSON found', repairSteps: ['no-json-found'] }
}
