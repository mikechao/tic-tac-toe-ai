import { useEffect, useMemo, useRef, useState } from 'react'

import { CirclePause, CirclePlay } from 'lucide-react'

import { localAIModels } from '@/data/models'
import { cn } from '@/lib/utils'
import { AnimatedList, MyMagicCard, StateMessage } from '@/components/ui'
import { useGameLoop } from '@/integrations/game-loop/context'
import type { MoveLogEntry } from '@/lib/game/match-log'

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
  const maxCells = boardSize * boardSize
  if (moveNumber > maxCells) return '—'
  return String(moveNumber)
}

type MatchMoveLogProps = {
  variant?: 'default' | 'recap'
  moves?: MoveLogEntry[]
  selectedMoveId?: string
  onSelectMove?: (moveId: string) => void
}

export function MatchMoveLog({
  variant = 'default',
  moves,
  selectedMoveId,
  onSelectMove,
}: MatchMoveLogProps) {
  const [isPaused, setIsPaused] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const { state } = useGameLoop()
  const boardSize = state.board.size
  const moveHistory = moves ?? state.moveHistory
  const isRecapVariant = variant === 'recap'
  const isInteractive = typeof onSelectMove === 'function'

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

  const resolvedMoves: ResolvedMove[] = useMemo(() => {
    return moveHistory.map((entry) => {
      const actorModel =
        entry.actor === 'modelA'
          ? modelA ?? localAIModels[0]
          : modelB ?? localAIModels[1]
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
  }, [modelA, modelB, boardSize, moveHistory])

  const latestMoveId = resolvedMoves[resolvedMoves.length - 1]?.id
  const selectedId = selectedMoveId ?? latestMoveId
  const showEmptyState = resolvedMoves.length === 0
  const reviewingRound =
    resolvedMoves[resolvedMoves.length - 1]?.round ?? Math.max(state.currentRound, 1)

  useEffect(() => {
    if (isRecapVariant || isPaused || !listRef.current || resolvedMoves.length === 0) {
      return
    }
    const element = listRef.current
    const lastItem = element.querySelector<HTMLElement>(
      `[data-move-id=\"${latestMoveId}\"]`,
    )
    if (!lastItem) {
      return
    }
    const raf = requestAnimationFrame(() => {
      const containerRect = element.getBoundingClientRect()
      const itemRect = lastItem.getBoundingClientRect()
      const offsetWithin = itemRect.top - containerRect.top + element.scrollTop
      const target =
        offsetWithin - element.clientHeight + itemRect.height + 8
      element.scrollTo({
        top: Math.max(0, target),
        behavior: resolvedMoves.length > 3 ? 'smooth' : 'auto',
      })
    })
    return () => {
      cancelAnimationFrame(raf)
    }
  }, [isRecapVariant, isPaused, latestMoveId, resolvedMoves.length])

  return (
    <MyMagicCard
      className={cn(
        "border-white/15 bg-white/4 px-0 py-0",
        !isRecapVariant && "h-full"
      )}
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
            {!isRecapVariant ? (
              <p className="text-sm text-white/70">
                Auto-scroll keeps you at the latest move; pause anytime to inspect
                a turn.
              </p>
            ) : null}
          </div>
          {!isRecapVariant ? (
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
          ) : null}
        </header>

        <div
          ref={listRef}
          className="relative flex-1 overflow-y-auto pr-1"
          style={isRecapVariant ? { maxHeight: '400px' } : { height: '350px' }}
          role="log"
          aria-live={isPaused ? 'off' : 'polite'}
        >
          {!hasConfiguredMatch || showEmptyState ? (
            <div className="flex items-center justify-center px-2 py-6 h-full">
              <StateMessage
                title={!hasConfiguredMatch ? "No move history yet" : "Waiting for the first move"}
                description={!hasConfiguredMatch
                  ? "As soon as a match begins, we'll record every move with reasoning and timing details."
                  : "Once the contenders make their opening plays, we'll populate this log with timestamps and rationale."
                }
                className="w-full"
              />
            </div>
          ) : isRecapVariant ? (
            <div className="flex flex-col gap-3">
              {resolvedMoves.map((move) => (
                <MoveEntry
                  key={move.id}
                  move={move}
                  isLatest={move.id === latestMoveId}
                  isSelected={move.id === selectedId}
                  interactive={isInteractive}
                  onSelect={onSelectMove}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3" style={isRecapVariant ? { maxHeight: '350px' } : { height: '300px' }}>
              <AnimatedList
                className="flex flex-col gap-3 h-full"
                delay={600}
                onNewItem={() => {
                  // Auto-scroll to top when new item animates in, unless paused
                  if (!isPaused && listRef.current) {
                    listRef.current.scrollTo({
                      top: 0,
                      behavior: 'smooth'
                    })
                  }
                }}
              >
              {resolvedMoves.map((move) => (
                <MoveEntry
                  key={move.id}
                  move={move}
                  isLatest={move.id === latestMoveId}
                />
              ))}
              </AnimatedList>
            </div>
          )}
        </div>
      </div>
    </MyMagicCard>
  )
}

function MoveEntry({
  move,
  isLatest,
  isSelected = false,
  interactive = false,
  onSelect,
}: {
  move: ResolvedMove
  isLatest: boolean
  isSelected?: boolean
  interactive?: boolean
  onSelect?: (moveId: string) => void
}) {
  const handleSelect = () => {
    if (interactive && onSelect) {
      onSelect(move.id)
    }
  }

  return (
    <article
      data-move-id={move.id}
      className={cn(
        'rounded-2xl border border-white/12 bg-white/5 p-4 text-sm transition',
        isSelected
          ? 'border-[#ffb547]/60 bg-white/15 shadow-[0_0_28px_rgba(255,181,71,0.3)]'
          : isLatest
            ? 'border-[#4ff2c2]/50 shadow-[0_0_28px_rgba(79,242,194,0.25)]'
            : 'hover:border-white/25 hover:bg-white/10',
        interactive && 'cursor-pointer',
      )}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? isSelected : undefined}
      onClick={interactive ? handleSelect : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleSelect()
              }
            }
          : undefined
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            'flex h-9 min-w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-base font-semibold uppercase',
            move.mark === 'X' ? 'text-[#4ff2c2]' : 'text-[#f15bb5]',
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
}
