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
  timeoutMs?: number
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

const DEFAULT_TIMEOUT_MS = 30_000

type MergeController = {
  signal: AbortSignal
  dispose: () => void
  didTimeout: () => boolean
  wasExternallyAborted: () => boolean
}

const mergeAbortSignals = (
  externalSignal: AbortSignal | undefined,
  timeoutMs: number,
): MergeController => {
  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let timedOut = false
  let externalAbort = false

  const abortHandler = () => {
    externalAbort = true
    controller.abort()
  }

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort()
    } else {
      externalSignal.addEventListener('abort', abortHandler)
    }
  }

  if (typeof timeoutMs === 'number' && timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
  }

  return {
    signal: controller.signal,
    dispose: () => {
      if (externalSignal) {
        externalSignal.removeEventListener('abort', abortHandler)
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    },
    didTimeout: () => timedOut,
    wasExternallyAborted: () => externalAbort,
  }
}

const isAbortError = (error: unknown): boolean => {
  return (
    (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

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

type ModelResolver = () => Promise<unknown>

type ProviderMetadata = {
  id: string
  label: string
}

async function requestMoveWithResolver(
  request: GeminiMoveRequest,
  resolveModel: ModelResolver,
  provider: ProviderMetadata,
): Promise<GeminiMoveResult> {
  console.debug('[AI Turn] Requesting move', {
    provider: provider.id,
    activeMark: request.activeMark,
    opponentMark: request.opponentMark,
    round: request.round,
    totalRounds: request.totalRounds,
    actorLabel: request.actorLabel,
  })

  let model: unknown
  try {
    model = await resolveModel()
  } catch (error) {
    console.error(`[AI Turn] Failed to ensure ${provider.label} model`, error)
    return {
      ok: false,
      reason: 'unavailable',
      message:
        error instanceof Error
          ? error.message
          : `Failed to initialize ${provider.label}`,
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
    const startedAt = typeof performance !== 'undefined'
      ? performance.now()
      : Date.now()
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const controller = mergeAbortSignals(request.abortSignal, timeoutMs)

    try {
      const result = await generateObject({
        model: model as any,
        schema: moveResponseSchema,
        prompt: currentPrompt,
        temperature: request.temperature ?? 0.1,
        abortSignal: controller.signal,
        experimental_telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
        }
      })
        .finally(() => {
          controller.dispose()
        })
      const { object } = result
      const finishedAt = typeof performance !== 'undefined'
        ? performance.now()
        : Date.now()
      const durationMs = finishedAt - startedAt

      if (!availableCells.has(object.nextMove)) {
        console.warn('[AI Turn] Gemini chose invalid cell', object.nextMove, {
          availableCells: Array.from(availableCells),
        })
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
      console.debug('[AI Turn] Move parsed', {
        moveIndex: object.nextMove,
        rationale: object.rationale,
      })

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
      controller.dispose()
      const finishedAt = typeof performance !== 'undefined'
        ? performance.now()
        : Date.now()
      const durationMs = finishedAt - startedAt
      console.error('[AI Turn] Move call failed', {
        provider: provider.id,
        error,
      })
      if (isAbortError(error)) {
        const message = controller?.didTimeout()
          ? `${provider.label} move inference timed out.`
          : `${provider.label} move inference aborted.`
        lastError = {
          ok: false,
          reason: 'unavailable',
          message,
          finishedAt,
          durationMs,
          startedAt,
        }
        break
      }
      lastError = {
        ok: false,
        reason: 'unavailable',
        message:
          error instanceof Error
            ? error.message
            : `Failed to call ${provider.label} model`,
        finishedAt,
        durationMs,
        startedAt,
      }
      break
    }
  }

  return (
    lastError ?? {
      ok: false,
      reason: 'invalid-response',
      message: `${provider.label} did not return a valid move.`,
    }
  )
}

export async function requestGeminiMove(
  request: GeminiMoveRequest,
): Promise<GeminiMoveResult> {
  return requestMoveWithResolver(request, ensureGeminiChatModel, {
    id: 'chrome-builtin',
    label: 'Gemini Nano',
  })
}

export async function requestTransformersMove(
  request: GeminiMoveRequest,
  ensureModel: () => Promise<unknown>,
): Promise<GeminiMoveResult> {
  return requestMoveWithResolver(request, ensureModel, {
    id: 'transformers-js',
    label: 'SmolLM2',
  })
}
