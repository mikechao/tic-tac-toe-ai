import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RoundResultResponse } from '@arena/schema'

import { getProviderMeta, localAIModels } from '@/data/models'
import { BoardState, type PlayerMark } from '@/lib/game/board-state'
import { submitRoundResult } from '@/lib/round-results'
import { buildRoundResultPayload } from '@/lib/round-results/build-round-result-payload'
import { MyMagicCard, RainbowButton, StateMessage } from '@/components/ui'
import { RoundProgressBar } from '@/components/ui/RoundProgressBar'
import { useConfetti } from '@/components/ui/confetti'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MatchMoveLog } from '@/components/arena/MatchMoveLog'
import { BoardGrid } from '@/components/arena/BoardGrid'
import type { MoveLogEntry } from '@/lib/game/match-log'
import { useGameLoop } from '@/integrations/game-loop/context'
import type { MatchConfig } from '@/lib/game/game-loop'

const actorToMark: Record<'modelA' | 'modelB', 'X' | 'O'> = {
  modelA: 'X',
  modelB: 'O',
}

type WinningLine = {
  mark: PlayerMark
  indices: number[]
}

function findWinningLine(board: BoardState): WinningLine | null {
  const size = board.size
  const cells = board.getCells()

  const evaluate = (indices: number[]): WinningLine | null => {
    const first = cells[indices[0]]
    if (first == null) {
      return null
    }
    for (let idx = 1; idx < indices.length; idx += 1) {
      if (cells[indices[idx]] !== first) {
        return null
      }
    }
    return { mark: first, indices }
  }

  for (let row = 0; row < size; row += 1) {
    const indices = Array.from(
      { length: size },
      (_, column) => row * size + column,
    )
    const result = evaluate(indices)
    if (result) {
      return result
    }
  }

  for (let column = 0; column < size; column += 1) {
    const indices = Array.from(
      { length: size },
      (_, row) => row * size + column,
    )
    const result = evaluate(indices)
    if (result) {
      return result
    }
  }

  const primaryDiagonal = Array.from(
    { length: size },
    (_, index) => index * size + index,
  )
  const secondaryDiagonal = Array.from(
    { length: size },
    (_, index) => index * size + (size - 1 - index),
  )

  return evaluate(primaryDiagonal) ?? evaluate(secondaryDiagonal)
}

function getWinningCellTheme(mark: PlayerMark | null): string {
  if (mark === 'X') {
    return 'border-[#4ff2c2]/70 bg-[#4ff2c2]/15 shadow-[0_0_28px_rgba(79,242,194,0.45)]'
  }
  if (mark === 'O') {
    return 'border-[#f15bb5]/70 bg-[#f15bb5]/12 shadow-[0_0_28px_rgba(241,91,181,0.45)]'
  }
  return ''
}

function getMoveId(entry: MoveLogEntry): string {
  return `${entry.round}-${entry.turn}`
}

function buildBoardSnapshot(
  boardSize: number,
  moves: MoveLogEntry[],
  moveCount: number,
): BoardState {
  const snapshot = new BoardState(boardSize)
  const total = Math.min(moveCount, moves.length)
  for (let index = 0; index < total; index += 1) {
    const entry = moves[index]
    const moveIndex = Math.max(0, entry.moveNumber - 1)
    const move = snapshot.fromIndex(moveIndex)
    snapshot.applyMove(move, actorToMark[entry.actor])
  }
  return snapshot
}

function getActorHighlightClass(actor: 'modelA' | 'modelB'): string {
  return actor === 'modelA'
    ? 'border-[#4ff2c2]/60 bg-[#4ff2c2]/20 shadow-[0_0_20px_rgba(79,242,194,0.3)]'
    : 'border-[#f15bb5]/60 bg-[#f15bb5]/18 shadow-[0_0_20px_rgba(241,91,181,0.3)]'
}

export function MatchBoard() {
  const { state, configure, start, nextRound, cancelMatch } = useGameLoop()
  const board = state.board
  const boardSize = board.size

  const modelAId = state.modelAId
  const modelBId = state.modelBId

  const hasConfiguredMatch =
    modelAId != null && modelBId != null && state.totalRounds > 0

  const modelA = useMemo(() => {
    if (modelAId == null) return undefined
    return localAIModels.find((model) => model.id === modelAId)
  }, [modelAId])

  const modelB = useMemo(() => {
    if (modelBId == null) return undefined
    return localAIModels.find((model) => model.id === modelBId)
  }, [modelBId])

  const formatModelLabel = (model: (typeof localAIModels)[number] | undefined): string => {
    if (!model) {
      return 'unknown-model'
    }
    const providerMeta = getProviderMeta(model.provider)
    return `${model.name} (${providerMeta.label})`
  }

  const playerOneModelLabel = formatModelLabel(modelA)
  const playerTwoModelLabel = formatModelLabel(modelB)

  const totalRounds = state.totalRounds
  const boardStatus = `Round ${Math.max(state.currentRound, 1)} of ${totalRounds}`
  const turnsRemaining = Math.max(0, totalRounds - state.currentRound)
  const winningLine = useMemo(() => findWinningLine(board), [board])
  const winningCellTheme = getWinningCellTheme(winningLine?.mark ?? null)
  const confetti = useConfetti()
  const lastCelebrationKey = useRef<string | null>(null)
  const celebrationTypeRef = useRef<'fireworks' | 'sideCannons'>('sideCannons')
  const [roundSummaryOpen, setRoundSummaryOpen] = useState(false)
  const [dialogActionPending, setDialogActionPending] = useState(false)
  const [roundSubmitPending, setRoundSubmitPending] = useState(false)
  const [selectedMoveId, setSelectedMoveId] = useState<string | null>(null)
  const [roundSaves, setRoundSaves] = useState<Record<number, RoundResultResponse>>({})
  const lastDialogRoundRef = useRef<number | null>(null)
  const lastSubmittedRoundRef = useRef<number | null>(null)
  const roundSubmissionRef = useRef<{
    round: number
    promise: Promise<RoundResultResponse>
  } | null>(null)
  const latestRoundSummary = state.roundSummaries.at(-1)
  const roundEnded = state.phase === 'betweenRounds' || state.phase === 'completed'
  const roundMoves = useMemo<MoveLogEntry[]>(() => {
    if (!latestRoundSummary) {
      return []
    }
    return state.moveHistory.filter(
      (entry) => entry.round === latestRoundSummary.round,
    )
  }, [state.moveHistory, latestRoundSummary])

  const scoreboard = state.score
  const progressPercent =
    totalRounds > 0
      ? Math.min(100, (state.currentRound / totalRounds) * 100)
      : 0
  const latestWinner = latestRoundSummary?.winner
  const roundLabel = latestRoundSummary ? `Round ${latestRoundSummary.round}` : 'Round complete'
  const winnerPlayerLabel =
    latestWinner === 'modelA'
      ? 'Player 1'
      : latestWinner === 'modelB'
        ? 'Player 2'
        : null
  const winnerName =
    latestWinner === 'modelA'
      ? modelA?.name ?? 'Model A'
      : latestWinner === 'modelB'
        ? modelB?.name ?? 'Model B'
        : null
  const winnerVariant =
    latestWinner === 'modelA'
      ? modelA?.variant
      : latestWinner === 'modelB'
        ? modelB?.variant
        : null
  const roundSummaryTitle =
    latestWinner === 'tie'
      ? `${roundLabel} ends in a tie`
      : latestWinner
        ? `${roundLabel} Winner ${winnerPlayerLabel ?? ''} ${winnerName ?? ''}`.trim()
        : 'Round complete'
  const roundSummarySubtitle =
    latestWinner === 'tie'
      ? 'Neither contender could break through. Review the full log before the next duel.'
      : winnerName
        ? `${winnerName}${winnerVariant ? ` - ${winnerVariant}` : ''}`
        : 'Review the move log for the latest round.'
  const hasNextRound = state.currentRound < totalRounds
  const dialogCtaLabel = hasNextRound ? 'Next Round' : 'Rematch'
  const player1Name = modelA?.name ?? 'Model A'
  const player2Name = modelB?.name ?? 'Model B'
  const dialogScoreLine = `Player 1 (${player1Name}) W: ${scoreboard.modelA} L: ${scoreboard.modelB} T: ${scoreboard.ties} • Player 2 (${player2Name}) W: ${scoreboard.modelB} L: ${scoreboard.modelA} T: ${scoreboard.ties}`
  const latestRoundSave = latestRoundSummary
    ? roundSaves[latestRoundSummary.round]
    : undefined
  const savedTimestampLabel = latestRoundSave
    ? `Saved ${new Date(latestRoundSave.persistedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : null
  const roundDialogOpen = roundSummaryOpen && Boolean(latestRoundSummary)
  const rematchReady = modelAId != null && modelBId != null
  const dialogActionDisabled =
    dialogActionPending || roundSubmitPending || (!hasNextRound && !rematchReady)

  const latestRoundBoard =
    latestRoundSummary && latestRoundSummary.round > 0
      ? state.roundBoards[latestRoundSummary.round - 1] ?? null
      : null

  const selectedMoveEntry = useMemo(() => {
    if (!roundMoves.length) {
      return null
    }
    const explicit = roundMoves.find((entry) => getMoveId(entry) === selectedMoveId)
    return explicit ?? roundMoves.at(-1) ?? null
  }, [roundMoves, selectedMoveId])

  const recapBoardSnapshot = useMemo(() => {
    if (roundMoves.length === 0) {
      const base = latestRoundBoard ?? board
      return base.clone()
    }
    const moveCount = selectedMoveEntry?.turn ?? roundMoves.length
    return buildBoardSnapshot(boardSize, roundMoves, moveCount)
  }, [board, boardSize, latestRoundBoard, roundMoves, selectedMoveEntry])

  const recapWinningLine = findWinningLine(recapBoardSnapshot)
  const recapHighlights: Array<{ indices: number[]; className?: string }> = []
  if (recapWinningLine) {
    recapHighlights.push({
      indices: recapWinningLine.indices,
      className: getWinningCellTheme(recapWinningLine.mark),
    })
  }
  if (selectedMoveEntry) {
    recapHighlights.push({
      indices: [Math.max(0, selectedMoveEntry.moveNumber - 1)],
      className: getActorHighlightClass(selectedMoveEntry.actor),
    })
  }

  const ensureRoundResultSubmitted = useCallback(
    async ({ rematchRequested }: { rematchRequested: boolean }) => {
      if (!latestRoundSummary) {
        return
      }

      const roundNumber = latestRoundSummary.round

      if (lastSubmittedRoundRef.current === roundNumber) {
        return
      }

      if (roundSubmissionRef.current?.round === roundNumber) {
        return roundSubmissionRef.current.promise
      }

      const payload = buildRoundResultPayload({
        summary: latestRoundSummary,
        moves: roundMoves,
        boardSize,
        totalRounds,
        playerOneModel: playerOneModelLabel,
        playerTwoModel: playerTwoModelLabel,
        rematchRequested,
      })

      if (!payload) {
        console.warn('[MatchBoard] Missing round payload, skipping submission', {
          round: roundNumber,
        })
        return
      }

      setRoundSubmitPending(true)
      const submissionPromise = submitRoundResult(payload)
        .then((result) => {
          lastSubmittedRoundRef.current = roundNumber
          setRoundSaves((current) => ({
            ...current,
            [roundNumber]: result,
          }))
          return result
        })
        .finally(() => {
          if (roundSubmissionRef.current?.round === roundNumber) {
            roundSubmissionRef.current = null
          }
          setRoundSubmitPending(false)
        })

      roundSubmissionRef.current = { round: roundNumber, promise: submissionPromise }
      return submissionPromise
    },
    [
      latestRoundSummary,
      roundMoves,
      boardSize,
      totalRounds,
      playerOneModelLabel,
      playerTwoModelLabel,
    ],
  )

  const handleRoundDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        void ensureRoundResultSubmitted({ rematchRequested: false })
        // If we're closing the dialog by dismissing it (not clicking Next Round/Rematch), cancel the match
        if (state.phase === 'betweenRounds' || state.phase === 'completed') {
          cancelMatch()
        }
      }
      setRoundSummaryOpen(nextOpen)
    },
    [ensureRoundResultSubmitted, state.phase, cancelMatch],
  )

  const handleRoundDialogAction = useCallback(async () => {
    if (hasNextRound) {
      setDialogActionPending(true)
      try {
        await ensureRoundResultSubmitted({ rematchRequested: false })
        setRoundSummaryOpen(false)
        nextRound()
      } catch (error) {
        console.error('[MatchBoard] Failed to submit round result', error)
      } finally {
        setDialogActionPending(false)
      }
      return
    }

    const rematchModelAId = modelAId
    const rematchModelBId = modelBId

    if (rematchModelAId == null || rematchModelBId == null) {
      return
    }

    const rematchConfig: MatchConfig = {
      modelAId: rematchModelAId,
      modelBId: rematchModelBId,
      boardSize,
      totalRounds,
      startingPlayer: 'alternate',
    }

    try {
      setDialogActionPending(true)
      await ensureRoundResultSubmitted({ rematchRequested: true })
      setRoundSummaryOpen(false)
      configure(rematchConfig)
      await start()
      lastDialogRoundRef.current = null
    } catch (error) {
      console.error('[MatchBoard] Rematch start failed', error)
    } finally {
      setDialogActionPending(false)
    }
  }, [
    ensureRoundResultSubmitted,
    hasNextRound,
    nextRound,
    modelAId,
    modelBId,
    boardSize,
    totalRounds,
    configure,
    start,
  ])

  const runFireworks = useCallback(() => {
    if (typeof window === 'undefined' || !confetti) {
      return
    }
    const duration = 5000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }
    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now()
      if (timeLeft <= 0) {
        window.clearInterval(interval)
        return
      }
      const particleCount = Math.round(50 * (timeLeft / duration))
      confetti.fire({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() * 0.2 },
      })
      confetti.fire({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() * 0.2 },
      })
    }, 250)

    return () => {
      window.clearInterval(interval)
    }
  }, [confetti])

  const runSideCannons = useCallback(() => {
    if (typeof window === 'undefined' || !confetti) {
      return
    }
    const end = Date.now() + 3000
    const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1'] as const
    let rafId = 0

    const frame = () => {
      if (Date.now() > end) {
        return
      }
      confetti.fire({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors: [...colors],
        zIndex: 9999,
      })
      confetti.fire({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: [...colors],
        zIndex: 9999,
      })
      rafId = window.requestAnimationFrame(frame)
    }

    rafId = window.requestAnimationFrame(frame)

    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [confetti])

  useEffect(() => {
    if (!winningLine || !confetti) {
      return
    }
    const celebrationKey = `${state.currentRound}-${winningLine.indices.join('-')}`
    if (lastCelebrationKey.current === celebrationKey) {
      return
    }
    lastCelebrationKey.current = celebrationKey
    const nextType =
      celebrationTypeRef.current === 'fireworks' ? 'sideCannons' : 'fireworks'
    celebrationTypeRef.current = nextType

    const cleanup = nextType === 'fireworks' ? runFireworks() : runSideCannons()

    return () => {
      cleanup?.()
    }
  }, [winningLine, state.currentRound, runFireworks, runSideCannons, confetti])

  useEffect(() => {
    if (!roundEnded || !latestRoundSummary) {
      return
    }
    if (lastDialogRoundRef.current === latestRoundSummary.round) {
      return
    }
    lastDialogRoundRef.current = latestRoundSummary.round
    setRoundSummaryOpen(true)
  }, [roundEnded, latestRoundSummary])

  useEffect(() => {
    if ((!roundEnded || !latestRoundSummary) && roundSummaryOpen) {
      setRoundSummaryOpen(false)
    }
  }, [roundEnded, latestRoundSummary, roundSummaryOpen])

  useEffect(() => {
    if (!roundDialogOpen) {
      return
    }
    const lastMove = roundMoves.at(-1)
    setSelectedMoveId(lastMove ? getMoveId(lastMove) : null)
  }, [roundDialogOpen, roundMoves])

  if (!hasConfiguredMatch) {
    return (
      <div className="flex h-full items-center justify-center">
        <StateMessage
          title="No active match"
          description="Queue a new showdown to populate the arena board. Once a match is running, the grid will animate with live moves."
          action={
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">
              Start a match from the controls
            </span>
          }
        />
      </div>
    )
  }

  return (
    <>
      <Dialog open={roundDialogOpen} onOpenChange={handleRoundDialogOpenChange}>
        {roundDialogOpen && latestRoundSummary ? (
          <DialogContent className="max-w-[90vw] sm:max-w-[90vw] border-white/15 bg-[#040716]/95 text-white">
            <DialogHeader className="gap-2">
              <DialogTitle className="font-display text-2xl text-white">
                {roundSummaryTitle}
              </DialogTitle>
              <DialogDescription className="text-white/70">
                {roundSummarySubtitle}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[65vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-2">
              <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <BoardGrid
                    board={recapBoardSnapshot}
                    boardSize={recapBoardSnapshot.size}
                    highlights={recapHighlights.length ? recapHighlights : undefined}
                    ariaLabel={`${roundLabel} board snapshot`}
                  />
                </div>
                <MatchMoveLog
                  variant="recap"
                  moves={roundMoves}
                  selectedMoveId={selectedMoveId ?? undefined}
                  onSelectMove={setSelectedMoveId}
                />
              </div>
            </div>
            <DialogFooter className="mt-4 w-full items-center justify-between gap-3 sm:flex">
              <div className="flex flex-col gap-1 text-xs uppercase tracking-[0.3em] text-white/60">
                <span>{dialogScoreLine}</span>
                {savedTimestampLabel ? (
                  <span className="text-[10px] uppercase tracking-[0.35em] text-white/50">
                    {savedTimestampLabel}
                  </span>
                ) : null}
              </div>
              <RainbowButton
                onClick={() => {
                  void handleRoundDialogAction()
                }}
                disabled={dialogActionDisabled}
              >
                {dialogCtaLabel}
              </RainbowButton>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
      <div className="flex flex-col gap-6 text-white">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Match Arena Board
        </p>
        <h2 className="font-display text-3xl font-semibold">
          {modelA?.name ?? 'Model A'} vs {modelB?.name ?? 'Model B'}
        </h2>
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/50">
          <span>{boardStatus}</span>
          <span aria-live="polite">
            {turnsRemaining === 0
              ? 'Final round underway'
              : `${turnsRemaining} ${
                  turnsRemaining === 1 ? 'round' : 'rounds'
                } remaining`}
          </span>
        </div>
        <RoundProgressBar value={progressPercent} />
      </header>

      <MyMagicCard className="border-white/15 bg-white/4" spotlight={false}>
        <div className="flex flex-col gap-6">
          <BoardGrid
            board={board}
            boardSize={boardSize}
            highlights={
              winningLine
                ? [{ indices: winningLine.indices, className: winningCellTheme }]
                : undefined
            }
          />
        </div>
      </MyMagicCard>
    </div>
    </>
  )
}
