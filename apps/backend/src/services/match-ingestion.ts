import { and, count, desc, eq } from 'drizzle-orm'

import type { Env } from '../env'
import { createDb } from '../lib/db'
import { matches, moves } from '../../drizzle/schema'
import type { RoundResultPayload } from './schemas'

const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000 // 10 minutes

export type PersistedRound = {
  matchId: string
  roundId: string
  moveCount: number
  persistedAt: string
  idempotent: boolean
}

export class MatchNotFoundError extends Error {
  constructor(message = 'Match not found') {
    super(message)
    this.name = 'MatchNotFoundError'
  }
}

export class RoundConflictError extends Error {
  constructor(message = 'Round already recorded with different data') {
    super(message)
    this.name = 'RoundConflictError'
  }
}

export class PersistenceError extends Error {
  constructor(message = 'Failed to persist round result', options?: { cause?: unknown }) {
    super(message)
    this.name = 'PersistenceError'
    if (options?.cause) {
      this.cause = options.cause
    }
  }
}

export async function recordRoundResult(
  env: Env,
  payload: RoundResultPayload,
): Promise<PersistedRound> {
  const db = createDb(env)

  const matchId = payload.matchId ?? crypto.randomUUID()
  if (payload.matchId) {
    const [existing] = await db
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.matchId, payload.matchId))
      .limit(1)
    if (!existing) {
      throw new MatchNotFoundError()
    }
  }

  const normalized = normalizePayload(payload)
  const canonical = canonicalizePayload(normalized, matchId)
  const roundId = await deriveDeterministicUuid(canonical)
  const recapHash = await createRecapHash(roundId, canonical)

  const matchRow = {
    matchId,
    roundId,
    playerOneModel: normalized.playerOneModel,
    playerTwoModel: normalized.playerTwoModel,
    opponentType: normalized.opponentType,
    difficulty: normalized.difficulty,
    boardSize: normalized.boardSize,
    currentRound: normalized.currentRound,
    totalRounds: normalized.totalRounds,
    startedAt: normalized.startedAt,
    finishedAt: normalized.finishedAt,
    rematchRequested: normalized.rematchRequested,
    aiModelVersion: normalized.aiModelVersion,
    outcome: normalized.outcome,
    winnerSlot: normalized.winner,
    durationMs: normalized.durationMs,
    recapHash,
  }

  const moveRows = normalized.moves.map((move) => ({
    roundId,
    turnIndex: move.turnIndex,
    cell: move.cell,
    symbol: move.symbol,
    elapsedMs: move.elapsedMs,
  }))

  const nowIso = new Date().toISOString()

  try {
    await db.transaction(async (tx) => {
      await tx.insert(matches).values(matchRow)
      if (moveRows.length > 0) {
        await tx.insert(moves).values(moveRows)
      }

      // Update leaderboard stats after match is saved
      const { updateLeaderboardForMatch } = await import('./leaderboard-updater')
      await updateLeaderboardForMatch(tx, matchId, roundId)
    })
    return {
      matchId,
      roundId,
      moveCount: moveRows.length,
      persistedAt: nowIso,
      idempotent: false,
    }
  } catch (error) {
    // Temporary debug logging to trace backend 500s during dev
    console.error('[recordRoundResult] failed to persist round', {
      message: error instanceof Error ? error.message : error,
    })
    if (isUniqueViolation(error)) {
      const [existing] = await db
        .select({
          matchId: matches.matchId,
          roundId: matches.roundId,
          createdAt: matches.createdAt,
        })
        .from(matches)
        .where(eq(matches.recapHash, recapHash))
        .orderBy(desc(matches.createdAt))
        .limit(1)

      if (existing) {
        const [moveCountRow] = await db
          .select({ value: count() })
          .from(moves)
          .where(eq(moves.roundId, existing.roundId))

        const persistedAt = existing.createdAt
          ? new Date(existing.createdAt).toISOString()
          : nowIso

        return {
          matchId: existing.matchId,
          roundId: existing.roundId,
          moveCount: toNumber(moveCountRow?.value),
          persistedAt,
          idempotent: true,
        }
      }

      const [conflict] = await db
        .select({ matchId: matches.matchId })
        .from(matches)
        .where(
          and(
            eq(matches.matchId, matchId),
            eq(matches.currentRound, normalized.currentRound),
          ),
        )
        .limit(1)

      if (conflict) {
        throw new RoundConflictError()
      }
    }

    throw new PersistenceError('Failed to persist round result', { cause: error })
  }
}

function normalizePayload(payload: RoundResultPayload) {
  const serverNow = new Date()
  let finishedAt = parseDate(payload.finishedAt)
  if (!finishedAt || Math.abs(serverNow.getTime() - finishedAt.getTime()) > MAX_CLOCK_SKEW_MS) {
    finishedAt = serverNow
  }

  let startedAt = parseDate(payload.startedAt)
  if (!startedAt || startedAt > finishedAt) {
    startedAt = new Date(finishedAt.getTime() - payload.durationMs)
  }

  const playerOneModel = payload.playerOneModel ?? 'unknown-model-a'
  const playerTwoModel = payload.playerTwoModel ?? 'unknown-model-b'
  const opponentType = inferOpponentType(playerTwoModel)
  const aiModelVersion = inferAiModelVersion(playerTwoModel, playerOneModel)

  const moves = [...payload.moves].sort((a, b) => a.turnIndex - b.turnIndex)

  return {
    matchId: payload.matchId,
    playerOneModel,
    playerTwoModel,
    opponentType,
    difficulty: payload.difficulty ?? 'standard',
    boardSize: payload.boardSize,
    currentRound: payload.currentRound,
    totalRounds: payload.totalRounds,
    startedAt,
    finishedAt,
    durationMs: payload.durationMs,
    outcome: payload.outcome,
    winner: payload.winner,
    moves,
    rematchRequested: payload.rematchRequested,
    aiModelVersion,
  }
}

function canonicalizePayload(
  normalized: ReturnType<typeof normalizePayload>,
  matchId: string,
) {
  return JSON.stringify({
    matchId,
    playerOneModel: normalized.playerOneModel,
    playerTwoModel: normalized.playerTwoModel,
    boardSize: normalized.boardSize,
    currentRound: normalized.currentRound,
    totalRounds: normalized.totalRounds,
    startedAt: normalized.startedAt.toISOString(),
    finishedAt: normalized.finishedAt.toISOString(),
    outcome: normalized.outcome,
    winner: normalized.winner,
    moves: normalized.moves.map((move) => ({
      turnIndex: move.turnIndex,
      cell: move.cell,
      symbol: move.symbol,
      elapsedMs: move.elapsedMs,
    })),
  })
}

async function deriveDeterministicUuid(input: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-1', encodeText(input))
  const bytes = new Uint8Array(hashBuffer.slice(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x50 // version 5 signature
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // RFC 4122 variant
  return formatUuid(bytes)
}

async function createRecapHash(roundId: string, canonical: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    encodeText(JSON.stringify({ roundId, canonical })),
  )
  return toHex(new Uint8Array(buffer))
}

const textEncoder = new TextEncoder()

function encodeText(value: string): ArrayBuffer {
  const encoded = textEncoder.encode(value)
  return encoded.buffer.slice(
    encoded.byteOffset,
    encoded.byteOffset + encoded.byteLength,
  )
}

function formatUuid(bytes: Uint8Array): string {
  const hex = toHex(bytes)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20, 32)}`
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function parseDate(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function inferOpponentType(model: string | null): 'ai' | 'human' {
  if (!model) {
    return 'ai'
  }
  return model.toLowerCase().includes('human') ? 'human' : 'ai'
}

function inferAiModelVersion(
  playerTwoModel: string | null,
  playerOneModel: string | null,
): string | null {
  return playerTwoModel ?? playerOneModel ?? null
}

function toNumber(value: bigint | number | undefined): number {
  if (typeof value === 'bigint') {
    return Number(value)
  }
  return value ?? 0
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }
  const maybeError = error as { code?: string; cause?: unknown }
  // Check if the error itself has the code
  if (maybeError.code === '23505') {
    return true
  }
  // Check if the cause has the code (wrapped by Drizzle)
  if (typeof maybeError.cause === 'object' && maybeError.cause !== null) {
    const maybeCause = maybeError.cause as { code?: string }
    return maybeCause.code === '23505'
  }
  return false
}
