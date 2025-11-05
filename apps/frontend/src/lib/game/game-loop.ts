import type { PlayerMark } from './board-state'
import { BoardState } from './board-state'

export type GameLoopPhase =
  | 'idle'
  | 'initializing'
  | 'running'
  | 'betweenRounds'
  | 'completed'
  | 'error'

export interface MatchConfig {
  matchId?: number
  modelAId: number
  modelBId: number
  boardSize: number
  totalRounds: number
  startingPlayer: 'modelA' | 'modelB' | 'alternate'
  moveTimeoutMs?: number
}

export interface MoveLogEntry {
  round: number
  turn: number
  actor: 'modelA' | 'modelB'
  moveNumber: number
  rationale: string
  wasValid: boolean
  durationMs: number
  rawResponse?: unknown
  timestamp: number
  timeout?: boolean
}

export interface RoundSummary {
  round: number
  winner: 'modelA' | 'modelB' | 'tie'
  totalMoves: number
  durationMs: number
  boardSnapshot: string
}

export interface GameLoopState {
  phase: GameLoopPhase
  currentRound: number
  totalRounds: number
  activePlayer: 'modelA' | 'modelB' | null
  board: BoardState
  score: { modelA: number; modelB: number; ties: number }
  moveHistory: MoveLogEntry[]
  roundSummaries: RoundSummary[]
  lastError?: string
  isPaused: boolean
}

export type GameLoopEvent =
  | { type: 'phase:change'; phase: GameLoopPhase }
  | { type: 'board:update'; board: BoardState }
  | { type: 'move:recorded'; entry: MoveLogEntry }
  | { type: 'round:complete'; summary: RoundSummary }
  | {
      type: 'match:complete'
      summaries: RoundSummary[]
      score: GameLoopState['score']
    }
  | { type: 'error'; message: string }

export interface GameLoopController {
  getState(): GameLoopState
  subscribe(
    listener: (state: GameLoopState, event?: GameLoopEvent) => void,
  ): () => void
  configure(config: MatchConfig): void
  start(): Promise<void>
  pause(): void
  resume(): void
  abort(reason?: string): void
  nextRound(): void
  dispose(): void
}

const defaultScore = { modelA: 0, modelB: 0, ties: 0 }

const createInitialState = (): GameLoopState => ({
  phase: 'idle',
  currentRound: 0,
  totalRounds: 0,
  activePlayer: null,
  board: new BoardState(),
  score: { ...defaultScore },
  moveHistory: [],
  roundSummaries: [],
  isPaused: false,
})

type GameLoopAction =
  | { type: 'CONFIGURE'; config: MatchConfig }
  | { type: 'START' }
  | { type: 'BEGIN_ROUND'; round: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'ABORT'; reason?: string }
  | { type: 'ERROR'; message: string }

type TransitionResult = {
  state: GameLoopState
  events?: GameLoopEvent[]
}

type TransitionHandler = (
  current: GameLoopState,
  action: GameLoopAction,
  context: { config: MatchConfig | null },
) => TransitionResult

const determineStartingPlayer = (
  config: MatchConfig,
  round: number,
): 'modelA' | 'modelB' => {
  if (config.startingPlayer === 'alternate') {
    return round % 2 === 1 ? 'modelA' : 'modelB'
  }
  return config.startingPlayer
}

const toPlayerMark = (player: 'modelA' | 'modelB'): PlayerMark =>
  player === 'modelA' ? 'X' : 'O'

const transitionMap: Record<GameLoopPhase, Partial<Record<GameLoopAction['type'], TransitionHandler>>> = {
  idle: {
    CONFIGURE: (current, action) => {
      const { config } = action
      const board = new BoardState(config.boardSize)
      return {
        state: {
          ...current,
          phase: 'idle',
          totalRounds: config.totalRounds,
          board,
          score: { ...defaultScore },
          moveHistory: [],
          roundSummaries: [],
          lastError: undefined,
          isPaused: false,
        },
        events: [{ type: 'board:update', board }],
      }
    },
    START: (current, _action, context) => {
      if (!context.config) {
        throw new Error('Match configuration missing. Call configure() first.')
      }
      return {
        state: {
          ...current,
          phase: 'initializing',
          currentRound: 0,
          totalRounds: context.config.totalRounds,
          activePlayer: null,
          score: { ...defaultScore },
          moveHistory: [],
          roundSummaries: [],
          lastError: undefined,
          isPaused: false,
        },
        events: [{ type: 'phase:change', phase: 'initializing' }],
      }
    },
  },
  initializing: {
    BEGIN_ROUND: (current, action, context) => {
      if (!context.config) {
        throw new Error('Match configuration missing. Call configure() first.')
      }
      if (action.round > context.config.totalRounds) {
        return {
          state: {
            ...current,
            phase: 'completed',
            currentRound: context.config.totalRounds,
            activePlayer: null,
            isPaused: false,
          },
          events: [{ type: 'phase:change', phase: 'completed' }],
        }
      }
      const startingPlayer = determineStartingPlayer(context.config, action.round)
      const board = new BoardState(
        context.config.boardSize,
        toPlayerMark(startingPlayer),
      )
      return {
        state: {
          ...current,
          phase: 'running',
          currentRound: action.round,
          totalRounds: context.config.totalRounds,
          activePlayer: startingPlayer,
          board,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'running' },
          { type: 'board:update', board },
        ],
      }
    },
    ERROR: (current, action) => ({
      state: {
        ...current,
        phase: 'error',
        lastError: action.message,
        isPaused: false,
      },
      events: [
        { type: 'phase:change', phase: 'error' },
        { type: 'error', message: action.message },
      ],
    }),
  },
  running: {
    PAUSE: (current) => ({
      state: { ...current, isPaused: true },
    }),
    RESUME: (current) => ({
      state: { ...current, isPaused: false },
    }),
    ABORT: (current, action) => ({
      state: {
        ...current,
        phase: 'error',
        lastError: action.reason ?? 'Match aborted',
        isPaused: false,
      },
      events: [
        { type: 'phase:change', phase: 'error' },
        {
          type: 'error',
          message: action.reason ?? 'Match aborted',
        },
      ],
    }),
    BEGIN_ROUND: (current, action, context) => {
      if (!context.config) {
        throw new Error('Match configuration missing. Call configure() first.')
      }
      if (action.round > context.config.totalRounds) {
        return {
          state: {
            ...current,
            phase: 'completed',
            activePlayer: null,
            isPaused: false,
          },
          events: [{ type: 'phase:change', phase: 'completed' }],
        }
      }
      const startingPlayer = determineStartingPlayer(context.config, action.round)
      const board = new BoardState(
        context.config.boardSize,
        toPlayerMark(startingPlayer),
      )
      return {
        state: {
          ...current,
          phase: 'running',
          currentRound: action.round,
          activePlayer: startingPlayer,
          board,
          isPaused: false,
        },
        events: [{ type: 'board:update', board }],
      }
    },
  },
  betweenRounds: {
    BEGIN_ROUND: (current, action, context) => {
      if (!context.config) {
        throw new Error('Match configuration missing. Call configure() first.')
      }
      if (action.round > context.config.totalRounds) {
        return {
          state: {
            ...current,
            phase: 'completed',
            activePlayer: null,
            isPaused: false,
          },
          events: [{ type: 'phase:change', phase: 'completed' }],
        }
      }
      const startingPlayer = determineStartingPlayer(context.config, action.round)
      const board = new BoardState(
        context.config.boardSize,
        toPlayerMark(startingPlayer),
      )
      return {
        state: {
          ...current,
          phase: 'running',
          currentRound: action.round,
          activePlayer: startingPlayer,
          board,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'running' },
          { type: 'board:update', board },
        ],
      }
    },
    ABORT: (current, action) => ({
      state: {
        ...current,
        phase: 'error',
        lastError: action.reason ?? 'Match aborted',
        isPaused: false,
      },
      events: [
        { type: 'phase:change', phase: 'error' },
        {
          type: 'error',
          message: action.reason ?? 'Match aborted',
        },
      ],
    }),
  },
  completed: {
    CONFIGURE: (current, action) => {
      const { config } = action
      const board = new BoardState(config.boardSize)
      return {
        state: {
          ...current,
          phase: 'idle',
          currentRound: 0,
          totalRounds: config.totalRounds,
          activePlayer: null,
          board,
          score: { ...defaultScore },
          moveHistory: [],
          roundSummaries: [],
          lastError: undefined,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'idle' },
          { type: 'board:update', board },
        ],
      }
    },
  },
  error: {
    CONFIGURE: (current, action) => {
      const { config } = action
      const board = new BoardState(config.boardSize)
      return {
        state: {
          ...current,
          phase: 'idle',
          currentRound: 0,
          totalRounds: config.totalRounds,
          activePlayer: null,
          board,
          score: { ...defaultScore },
          moveHistory: [],
          roundSummaries: [],
          lastError: undefined,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'idle' },
          { type: 'board:update', board },
        ],
      }
    },
  },
}

const validateConfig = (config: MatchConfig): void => {
  if (config.totalRounds <= 0) {
    throw new Error('totalRounds must be greater than 0')
  }
  if (config.boardSize < 3 || config.boardSize > 5) {
    throw new Error('boardSize must be between 3 and 5')
  }
  if (config.modelAId === config.modelBId) {
    throw new Error('Select distinct models for modelA and modelB')
  }
}

export function createGameLoopController(): GameLoopController {
  let state = createInitialState()
  let config: MatchConfig | null = null
  const listeners = new Set<
    (next: GameLoopState, event?: GameLoopEvent) => void
  >()

  const notify = (event?: GameLoopEvent): void => {
    const snapshot = state
    for (const listener of listeners) {
      listener(snapshot, event)
    }
  }

  const publish = (result: TransitionResult): void => {
    state = result.state
    notify()
    if (result.events) {
      for (const event of result.events) {
        notify(event)
      }
    }
  }

  const dispatch = (action: GameLoopAction): void => {
    if (action.type === 'CONFIGURE') {
      // allow configure regardless of current phase via fallback to idle handler
      const handler =
        transitionMap[state.phase]?.[action.type] ??
        transitionMap.idle[action.type as 'CONFIGURE']
      if (!handler) {
        return
      }
      const result = handler(state, action, { config })
      publish(result)
      return
    }
    const handlers = transitionMap[state.phase]
    const handler = handlers?.[action.type]
    if (!handler) {
      return
    }
    const result = handler(state, action, { config })
    publish(result)
  }

  const getState = (): GameLoopState => state

  const subscribe = (
    listener: (next: GameLoopState, event?: GameLoopEvent) => void,
  ): (() => void) => {
    listeners.add(listener)
    listener(state)
    return () => {
      listeners.delete(listener)
    }
  }

  const configure = (nextConfig: MatchConfig): void => {
    validateConfig(nextConfig)
    config = nextConfig
    dispatch({ type: 'CONFIGURE', config: nextConfig })
  }

  const start = async (): Promise<void> => {
    dispatch({ type: 'START' })
    dispatch({ type: 'BEGIN_ROUND', round: 1 })
  }

  const pause = (): void => {
    dispatch({ type: 'PAUSE' })
  }

  const resume = (): void => {
    dispatch({ type: 'RESUME' })
  }

  const abort = (_reason?: string): void => {
    dispatch({ type: 'ABORT', reason: _reason })
  }

  const nextRound = (): void => {
    if (!config) {
      throw new Error('Match configuration missing. Call configure() first.')
    }
    const targetRound = state.currentRound + 1
    dispatch({ type: 'BEGIN_ROUND', round: targetRound })
  }

  const dispose = (): void => {
    listeners.clear()
    state = createInitialState()
    config = null
    notify({ type: 'phase:change', phase: state.phase })
  }

  return {
    getState,
    subscribe,
    configure,
    start,
    pause,
    resume,
    abort,
    nextRound,
    dispose,
  }
}
