import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  createGameLoopController,
  type GameLoopController,
  type GameLoopEvent,
  type GameLoopState,
  type MatchConfig,
  type RecordMoveInput,
} from '@/lib/game/game-loop'
import { requestGeminiMove } from '@/lib/game/ai-turn'
import type { PlayerMark } from '@/lib/game/board-state'

type GameLoopContextValue = {
  state: GameLoopState
  lastEvent?: GameLoopEvent
  configure: (config: MatchConfig) => void
  start: () => Promise<void>
  pause: () => void
  resume: () => void
  abort: (reason?: string) => void
  nextRound: () => void
  recordMove: (input: RecordMoveInput) => void
  controller: GameLoopController
}

const GameLoopContext = createContext<GameLoopContextValue | undefined>(
  undefined,
)

export function GameLoopProvider({ children }: { children: ReactNode }) {
  const controllerRef = useRef<GameLoopController | null>(null)
  if (!controllerRef.current) {
    controllerRef.current = createGameLoopController()
  }
  const controller = controllerRef.current
  const [state, setState] = useState<GameLoopState>(() => controller.getState())
  const [lastEvent, setLastEvent] = useState<GameLoopEvent | undefined>()
  const matchConfigRef = useRef<MatchConfig | null>(null)
  const turnInFlightRef = useRef(false)
  const turnAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const unsubscribe = controller.subscribe((nextState, event) => {
      setState(nextState)
      if (event) {
        setLastEvent(event)
      }
    })
    return () => {
      unsubscribe()
      controller.dispose()
      controllerRef.current = null
      matchConfigRef.current = null
      turnAbortRef.current?.abort()
      turnAbortRef.current = null
      turnInFlightRef.current = false
    }
  }, [controller])

  const value = useMemo<GameLoopContextValue>(
    () => ({
      state,
      lastEvent,
      configure: (config) => {
        matchConfigRef.current = config
        controller.configure(config)
      },
      start: () => controller.start(),
      pause: () => controller.pause(),
      resume: () => controller.resume(),
      abort: (reason?: string) => controller.abort(reason),
      nextRound: () => controller.nextRound(),
      recordMove: (input) => controller.recordMove(input),
      controller,
    }),
    [controller, lastEvent, state],
  )

  useEffect(() => {
    const config = matchConfigRef.current
    if (
      !config ||
      state.phase !== 'running' ||
      state.activePlayer == null ||
      state.isPaused ||
      turnInFlightRef.current
    ) {
      if (
        (state.phase !== 'running' || state.activePlayer == null || state.isPaused) &&
        turnAbortRef.current
      ) {
        turnAbortRef.current.abort()
        turnAbortRef.current = null
        turnInFlightRef.current = false
      }
      return
    }

    const actor = state.activePlayer
    const actorMark: PlayerMark = actor === 'modelA' ? 'X' : 'O'
    const opponentMark: PlayerMark = actorMark === 'X' ? 'O' : 'X'

    const abortController = new AbortController()
    turnAbortRef.current = abortController
    turnInFlightRef.current = true

    ;(async () => {
      try {
        const result = await requestGeminiMove({
          board: state.board,
          activeMark: actorMark,
          opponentMark,
          round: state.currentRound,
          totalRounds: config.totalRounds,
          actorLabel: actor,
          timeoutMs: config.moveTimeoutMs,
          abortSignal: abortController.signal,
        })

        if (abortController.signal.aborted) {
          return
        }

        if (result.ok) {
          controller.recordMove({
            actor,
            move: result.move,
            rationale: result.rationale,
            durationMs: result.durationMs,
            rawResponse: result.raw,
            wasValid: true,
            timestamp: Date.now(),
            timeout: false,
          })
        } else {
          controller.abort(result.message)
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          const message =
            error instanceof Error ? error.message : 'Unexpected AI turn error'
          controller.abort(message)
        }
      } finally {
        if (turnAbortRef.current === abortController) {
          turnAbortRef.current = null
        }
        turnInFlightRef.current = false
      }
    })()

    return () => {
      if (!abortController.signal.aborted) {
        abortController.abort()
      }
    }
  }, [
    controller,
    state.activePlayer,
    state.board,
    state.currentRound,
    state.isPaused,
    state.phase,
    state.totalRounds,
  ])

  return (
    <GameLoopContext.Provider value={value}>
      {children}
    </GameLoopContext.Provider>
  )
}

export function useGameLoop(): GameLoopContextValue {
  const context = useContext(GameLoopContext)
  if (!context) {
    throw new Error('useGameLoop must be used within a GameLoopProvider')
  }
  return context
}
