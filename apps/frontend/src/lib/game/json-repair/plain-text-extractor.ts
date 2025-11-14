import type { JsonRepairResult } from './types'

export function extractFromPlainText(text: string): JsonRepairResult {
  // Pattern 1: "Next move: X" with various formats
  const movePatterns = [
    /Next move:\s*(\d+)/i,
    /Move:\s*(\d+)/i,
    /I choose\s*(\d+)/i,
    /I play\s*(\d+)/i,
    /Cell\s*(\d+)/i
  ]

  // Pattern 2: "Rationale: ..." with various formats
  const rationalePatterns = [
    /Rationale:\s*([\s\S]+)/i,
    /Reason:\s*([\s\S]+)/i,
    /Because\s+([\s\S]+)/i,
    /I choose this because\s+([\s\S]+)/i
  ]

  let nextMove: number | null = null
  let rationale: string = ''

  // Extract move number
  for (const pattern of movePatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const moveNum = parseInt(match[1], 10)
      if (moveNum >= 1 && moveNum <= 9) {
        nextMove = moveNum
        break
      }
    }
  }

  // Extract rationale
  for (const pattern of rationalePatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      rationale = match[1].trim().substring(0, 500) // Limit length
      break
    }
  }

  // Fallback: look for any number 1-9 as move
  if (!nextMove) {
    const numberMatch = text.match(/\b([1-9])\b/)
    if (numberMatch) {
      nextMove = parseInt(numberMatch[1], 10)
    }
  }

  // Fallback: use first sentence as rationale
  if (!rationale) {
    const sentenceMatch = text.match(/([^\.!?]+[\.!?])/)
    if (sentenceMatch) {
      rationale = sentenceMatch[1].trim().substring(0, 500)
    } else {
      rationale = text.substring(0, 200).trim()
    }
  }

  if (nextMove && nextMove >= 1 && nextMove <= 9) {
    return {
      success: true,
      data: { nextMove, rationale: rationale || 'No rationale provided' },
      repairSteps: ['plain-text-extraction']
    }
  }

  return {
    success: false,
    error: 'Could not extract valid move (1-9) from plain text',
    repairSteps: ['plain-text-failed']
  }
}