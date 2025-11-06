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
    }
  }, [controller])

  const value = useMemo<GameLoopContextValue>(
    () => ({
      state,
      lastEvent,
      configure: (config) => controller.configure(config),
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
