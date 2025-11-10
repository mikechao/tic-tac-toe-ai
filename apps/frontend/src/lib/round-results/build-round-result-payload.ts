import type { RoundResult } from '@arena/schema'

import type { RoundSummary } from '@/lib/game/game-loop'
import type { MoveLogEntry } from '@/lib/game/match-log'

type BuildRoundResultPayloadOptions = {
  summary: RoundSummary
  moves: MoveLogEntry[]
  boardSize: number
  totalRounds: number
  playerOneModel?: string
  playerTwoModel?: string
  rematchRequested: boolean
}

const actorToSymbol: Record<'modelA' | 'modelB', 'X' | 'O'> = {
  modelA: 'X',
  modelB: 'O',
}

function normalizeBoardSize(boardSize: number): 3 | 4 | 5 {
  if (boardSize === 3 || boardSize === 4 || boardSize === 5) {
    return boardSize
  }
  return 3
}

export function buildRoundResultPayload({
  summary,
  moves,
  boardSize,
  totalRounds,
  playerOneModel,
  playerTwoModel,
  rematchRequested,
}: BuildRoundResultPayloadOptions): RoundResult | null {
  if (!moves.length) {
    return null
  }

  const orderedMoves = [...moves].sort((a, b) => a.turn - b.turn)
  const timestamps = orderedMoves
    .map((entry) => entry.timestamp)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  const finishedAtMs = timestamps.length ? Math.max(...timestamps) : Date.now()
  const inferredDuration = Math.max(
    0,
    timestamps.length ? finishedAtMs - Math.min(...timestamps) : 0,
  )
  const durationMs = Math.max(summary.durationMs ?? inferredDuration, 0)
  const startedAtMs = finishedAtMs - durationMs

  const winner =
    summary.winner === 'modelA'
      ? 'player1'
      : summary.winner === 'modelB'
        ? 'player2'
        : 'draw'

  const outcome =
    winner === 'player1' ? 'win' : winner === 'player2' ? 'loss' : 'draw'

  return {
    playerOneModel: playerOneModel ?? null,
    playerTwoModel: playerTwoModel ?? null,
    boardSize: normalizeBoardSize(boardSize),
    currentRound: summary.round,
    totalRounds: Math.max(1, totalRounds),
    startedAt: new Date(Math.max(0, startedAtMs)).toISOString(),
    finishedAt: new Date(Math.max(finishedAtMs, startedAtMs)).toISOString(),
    durationMs,
    outcome,
    winner,
    moves: orderedMoves.map((entry) => ({
      turnIndex: Math.max(0, entry.turn - 1),
      cell: Math.max(0, entry.moveNumber - 1),
      symbol: actorToSymbol[entry.actor],
      elapsedMs: Math.max(0, entry.durationMs),
    })),
    rematchRequested,
  }
}
