import { generateObject } from 'ai'
import { z } from 'zod'

import type { BoardState, Move, PlayerMark } from './board-state'
import { ensureGeminiChatModel } from '@/integrations/gemini/model'

const moveResponseSchema = z.object({
  nextMove: z.number().int(),
  rationale: z.string().min(1, 'Provide a concise rationale'),
})

export type GeminiMoveRequest = {
  board: BoardState
  activeMark: PlayerMark
  opponentMark: PlayerMark
  round: number
  totalRounds: number
  actorLabel: 'modelA' | 'modelB'
  temperature?: number
  abortSignal?: AbortSignal
  maxRetries?: number
}

export type GeminiMoveSuccess = {
  ok: true
  move: Move
  cellNumber: number
  rationale: string
  raw: unknown
  durationMs: number
  startedAt: number
  finishedAt: number
}

export type GeminiMoveFailure = {
  ok: false
  reason: 'invalid-response' | 'unavailable'
  message: string
  raw?: unknown
  durationMs?: number
  startedAt?: number
  finishedAt?: number
}

export type GeminiMoveResult = GeminiMoveSuccess | GeminiMoveFailure

const buildPrompt = (request: GeminiMoveRequest, asciiBoard: string): string => {
  const availableCells = request.board
    .getValidMoves()
    .map((move) => move.index + 1)
    .join(', ')

  return [
    'You are an AI competing in a multi-round tic-tac-toe tournament.',
    `You play as ${request.activeMark}. Your opponent uses ${request.opponentMark}.`,
    `This is round ${request.round} of ${request.totalRounds}.`,
    'Game rules: three in a row horizontally, vertically, or diagonally wins.',
    'Board layout numbers correspond to cells 1 through 9 in reading order.',
    'Only choose from currently empty cells.',
    '',
    asciiBoard,
    '',
    `Empty cells: ${availableCells || 'none'}.
Respond with JSON { "nextMove": number, "rationale": string } only.`,
  ].join('\n')
}

export async function requestGeminiMove(
  request: GeminiMoveRequest,
): Promise<GeminiMoveResult> {
  let model
  try {
    model = await ensureGeminiChatModel()
  } catch (error) {
    return {
      ok: false,
      reason: 'unavailable',
      message:
        error instanceof Error ? error.message : 'Failed to initialize Gemini',
    }
  }

  const asciiBoard = request.board.toAscii(false)
  let currentPrompt = buildPrompt(request, asciiBoard)

  const availableCells = new Set(
    request.board.getValidMoves().map((move) => move.index + 1),
  )

  const attempts = Math.max(1, request.maxRetries ?? 2)

  let lastError: GeminiMoveFailure | null = null

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const startedAt = typeof performance !== 'undefined'
        ? performance.now()
        : Date.now()
      const result = await generateObject({
        model,
        schema: moveResponseSchema,
        prompt: currentPrompt,
        temperature: request.temperature ?? 0.1,
        abortSignal: request.abortSignal,
      })
      const { object } = result
      const finishedAt = typeof performance !== 'undefined'
        ? performance.now()
        : Date.now()
      const durationMs = finishedAt - startedAt

      if (!availableCells.has(object.nextMove)) {
        lastError = {
          ok: false,
          reason: 'invalid-response',
          message: `Model selected occupied cell ${object.nextMove}.`,
          raw: result.response.body,
          durationMs,
          startedAt,
          finishedAt,
        }
        currentPrompt = `Previous response chose invalid cell ${object.nextMove}. Choose from these open cells: ${Array.from(availableCells).join(', ')}.\n${buildPrompt(request, asciiBoard)}`
        continue
      }

      const move = request.board.fromIndex(object.nextMove - 1)

      return {
        ok: true,
        move,
        cellNumber: object.nextMove,
        rationale: object.rationale,
        raw: result.response.body,
        durationMs,
        startedAt,
        finishedAt,
      }
    } catch (error) {
      const finishedAt = typeof performance !== 'undefined'
        ? performance.now()
        : Date.now()
      const durationMs = 0
      lastError = {
        ok: false,
        reason: 'unavailable',
        message:
          error instanceof Error ? error.message : 'Failed to call Gemini model',
        finishedAt,
        durationMs,
      }
      break
    }
  }

  return (
    lastError ?? {
      ok: false,
      reason: 'invalid-response',
      message: 'Gemini did not return a valid move.',
    }
  )
}
