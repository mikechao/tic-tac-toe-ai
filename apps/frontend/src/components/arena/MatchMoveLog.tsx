import { useEffect, useMemo, useRef, useState } from 'react'

import { CirclePause, CirclePlay } from 'lucide-react'

import type { MatchListResponse } from '@arena/schema'

import { demoModels } from '@/data/demo.models'
import { cn } from '@/lib/utils'
import { AnimatedList, MyMagicCard, StateMessage } from '@/components/ui'
import { useGameLoop } from '@/integrations/game-loop/context'

type MatchSummary = MatchListResponse['matches'][number]

const ROW_LABELS = ['A', 'B', 'C', 'D', 'E']
const actorToMark: Record<'modelA' | 'modelB', 'X' | 'O'> = {
  modelA: 'X',
  modelB: 'O',
}

type ResolvedMove = {
  id: string
  actor: 'modelA' | 'modelB'
  coordinate: string
  mark: 'X' | 'O'
  round: number
  turn: number
  durationSeconds: number
  timestamp: number
  rationale: string
  modelName: string
}

function toCoordinate(moveNumber: number, boardSize: number): string {
  if (boardSize <= 0 || moveNumber <= 0) return '—'
  const index = moveNumber - 1
  const row = Math.floor(index / boardSize)
  const column = index % boardSize
  const rowLabel = ROW_LABELS[row] ?? `R${row + 1}`
  return `${rowLabel}${column + 1}`
}

export function MatchMoveLog({ match }: { match?: MatchSummary }) {
  const [isPaused, setIsPaused] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const { state } = useGameLoop()
  const boardSize = state.board.size
  const moveHistory = state.moveHistory

  const modelAId = match?.modelAId
  const modelBId = match?.modelBId
  const hasMatch = Boolean(match)

  const modelA = useMemo(() => {
    if (modelAId == null) return undefined
    return demoModels.find((model) => model.id === modelAId)
  }, [modelAId])

  const modelB = useMemo(() => {
    if (modelBId == null) return undefined
    return demoModels.find((model) => model.id === modelBId)
  }, [modelBId])

  const resolvedMoves: ResolvedMove[] = useMemo(() => {
    if (!match) return []
    return moveHistory.map((entry) => {
      const actorModel =
        entry.actor === 'modelA' ? modelA ?? demoModels[0] : modelB ?? demoModels[1]
      return {
        id: `${entry.round}-${entry.turn}`,
        actor: entry.actor,
        coordinate: toCoordinate(entry.moveNumber, boardSize),
        mark: actorToMark[entry.actor],
        round: entry.round,
        turn: entry.turn,
        durationSeconds: entry.durationMs / 1000,
        timestamp: entry.timestamp,
        rationale: entry.rationale,
        modelName: actorModel?.name ?? (entry.actor === 'modelA' ? 'Model A' : 'Model B'),
      }
    })
  }, [match, modelA, modelB, boardSize, moveHistory])

  useEffect(() => {
    if (isPaused || !listRef.current || resolvedMoves.length === 0) return
    const element = listRef.current
    element.scrollTo({
      top: element.scrollHeight,
      behavior: 'smooth',
    })
  }, [isPaused, resolvedMoves.length])

  const latestMoveId = resolvedMoves[resolvedMoves.length - 1]?.id
  const showEmptyState = resolvedMoves.length === 0
  const reviewingRound =
    resolvedMoves[resolvedMoves.length - 1]?.round ?? Math.max(state.currentRound, 1)

  return (
    <MyMagicCard
      className="border-white/15 bg-white/[0.04] px-0 py-0"
      spotlight={false}
    >
      <div className="flex h-full flex-col gap-4 rounded-[1.45rem] bg-[#0b1026]/70 px-6 py-6 text-white backdrop-blur">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              Move Log
            </p>
            <h3 className="font-display text-xl">
              Reviewing round {reviewingRound}
            </h3>
            <p className="text-sm text-white/70">
              Auto-scroll keeps you at the latest move; pause anytime to inspect
              a turn.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsPaused((previous) => !previous)}
            className={cn(
              'inline-flex items-center justify-center rounded-full border border-white/20 p-2 text-xs font-semibold uppercase tracking-[0.2em] transition',
              isPaused
                ? 'bg-white/10 text-white hover:bg-white/15 hover:cursor-pointer'
                : 'bg-[#4ff2c2]/20 text-white hover:bg-[#4ff2c2]/30 hover:cursor-pointer',
            )}
            aria-pressed={isPaused}
            aria-label={isPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
          >
            {isPaused ? (
              <CirclePlay className="h-10 w-10" />
            ) : (
              <CirclePause className="h-10 w-10" />
            )}
          </button>
        </header>

        <div
          ref={listRef}
          className="relative max-h-80 overflow-y-auto pr-1"
          role="log"
          aria-live={isPaused ? 'off' : 'polite'}
        >
          {!hasMatch ? (
            <div className="px-2 py-6">
              <StateMessage
                title="No move history yet"
                description="As soon as a match begins, we’ll record every move with reasoning and timing details."
                className="w-full"
              />
            </div>
          ) : showEmptyState ? (
            <div className="px-2 py-6">
              <StateMessage
                title="Waiting for the first move"
                description="Once the contenders make their opening plays, we’ll populate this log with timestamps and rationale."
                className="w-full"
              />
            </div>
          ) : (
            <AnimatedList className="flex flex-col gap-3" delay={600}>
              {resolvedMoves.map((move) => {
                const isLatest = move.id === latestMoveId
                return (
                  <article
                    key={move.id}
                    className={cn(
                      'rounded-2xl border border-white/12 bg-white/5 p-4 text-sm transition',
                      isLatest
                        ? 'border-[#4ff2c2]/50 shadow-[0_0_28px_rgba(79,242,194,0.25)]'
                        : 'hover:border-white/25 hover:bg-white/10',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={cn(
                          'flex h-9 min-w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-base font-semibold uppercase',
                          move.mark === 'X'
                            ? 'text-[#4ff2c2]'
                            : 'text-[#f15bb5]',
                        )}
                        aria-hidden="true"
                      >
                        {move.mark}
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                        <p className="font-semibold text-white">
                          {move.modelName}{' '}
                          <span className="text-white/60">
                            · round {move.round}, turn {move.turn}
                          </span>
                        </p>
                        <span className="text-xs uppercase tracking-[0.3em] text-white/50">
                          {new Date(move.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <span className="ml-auto text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                        {move.coordinate} · {move.durationSeconds.toFixed(1)}s
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="text-white/70">{move.rationale}</p>
                    </div>
                  </article>
                )
              })}
            </AnimatedList>
          )}
        </div>
      </div>
    </MyMagicCard>
  )
}
