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
  roundBoards: BoardState[]
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
  roundBoards: [],
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
  | { type: 'ADVANCE_TO_BETWEEN_ROUNDS' }
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

const transitionMap: Record<
  GameLoopPhase,
  Partial<Record<GameLoopAction['type'], TransitionHandler>>
> = {
  idle: {
    CONFIGURE: (current, action) => {
      const { config } = action as Extract<GameLoopAction, { type: 'CONFIGURE' }>
      const board = new BoardState(config.boardSize)
      return {
        state: {
          ...current,
          phase: 'idle',
          totalRounds: config.totalRounds,
          board,
          roundBoards: [],
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
      const totalRounds = context.config.totalRounds
      const roundBoards = Array.from({ length: totalRounds }, (_, index) => {
        const roundNumber = index + 1
        const startingPlayer = determineStartingPlayer(context.config!, roundNumber)
        return new BoardState(
          context.config!.boardSize,
          toPlayerMark(startingPlayer),
        )
      })
      const firstBoard = roundBoards[0] ?? new BoardState(context.config.boardSize)
      return {
        state: {
          ...current,
          phase: 'initializing',
          currentRound: 0,
          totalRounds,
          activePlayer: null,
          board: firstBoard,
          roundBoards,
          score: { ...defaultScore },
          moveHistory: [],
          roundSummaries: [],
          lastError: undefined,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'initializing' },
          { type: 'board:update', board: firstBoard },
        ],
      }
    },
  },
  initializing: {
    BEGIN_ROUND: (current, action, context) => {
      if (!context.config) {
        throw new Error('Match configuration missing. Call configure() first.')
      }
      const { round } = action as Extract<GameLoopAction, { type: 'BEGIN_ROUND' }>
      if (round > context.config.totalRounds) {
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
      const startingPlayer = determineStartingPlayer(context.config, round)
      const startingMark = toPlayerMark(startingPlayer)
      const nextRoundBoards = [...current.roundBoards]
      const roundIndex = Math.max(0, round - 1)
      let board = nextRoundBoards[roundIndex]
      if (!board) {
        board = new BoardState(context.config.boardSize, startingMark)
        nextRoundBoards[roundIndex] = board
      } else {
        board.reset(startingMark)
      }
      return {
        state: {
          ...current,
          phase: 'running',
          currentRound: round,
          totalRounds: context.config.totalRounds,
          activePlayer: startingPlayer,
          board,
          roundBoards: nextRoundBoards,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'running' },
          { type: 'board:update', board },
        ],
      }
    },
    ERROR: (current, action) => {
      const { message } = action as Extract<GameLoopAction, { type: 'ERROR' }>
      return {
        state: {
          ...current,
          phase: 'error',
          lastError: message,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'error' },
          { type: 'error', message },
        ],
      }
    },
  },
  running: {
    PAUSE: (current) => ({
      state: { ...current, isPaused: true },
    }),
    RESUME: (current) => ({
      state: { ...current, isPaused: false },
    }),
    ABORT: (current, action) => {
      const { reason } = action as Extract<GameLoopAction, { type: 'ABORT' }>
      const message = reason ?? 'Match aborted'
      return {
        state: {
          ...current,
          phase: 'error',
          lastError: message,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'error' },
          {
            type: 'error',
            message,
          },
        ],
      }
    },
    BEGIN_ROUND: (current, action, context) => {
      if (!context.config) {
        throw new Error('Match configuration missing. Call configure() first.')
      }
      const { round } = action as Extract<GameLoopAction, { type: 'BEGIN_ROUND' }>
      if (round > context.config.totalRounds) {
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
      const startingPlayer = determineStartingPlayer(context.config, round)
      const startingMark = toPlayerMark(startingPlayer)
      const nextRoundBoards = [...current.roundBoards]
      const roundIndex = Math.max(0, round - 1)
      let board = nextRoundBoards[roundIndex]
      if (!board) {
        board = new BoardState(context.config.boardSize, startingMark)
        nextRoundBoards[roundIndex] = board
      } else {
        board.reset(startingMark)
      }
      return {
        state: {
          ...current,
          phase: 'running',
          currentRound: round,
          activePlayer: startingPlayer,
          board,
          roundBoards: nextRoundBoards,
          isPaused: false,
        },
        events: [{ type: 'board:update', board }],
      }
    },
    ADVANCE_TO_BETWEEN_ROUNDS: (current) => ({
      state: {
        ...current,
        phase: 'betweenRounds',
        activePlayer: null,
        isPaused: false,
      },
      events: [{ type: 'phase:change', phase: 'betweenRounds' }],
    }),
  },
  betweenRounds: {
    BEGIN_ROUND: (current, action, context) => {
      if (!context.config) {
        throw new Error('Match configuration missing. Call configure() first.')
      }
      const { round } = action as Extract<GameLoopAction, { type: 'BEGIN_ROUND' }>
      if (round > context.config.totalRounds) {
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
      const startingPlayer = determineStartingPlayer(context.config, round)
      const startingMark = toPlayerMark(startingPlayer)
      const nextRoundBoards = [...current.roundBoards]
      const roundIndex = Math.max(0, round - 1)
      let board = nextRoundBoards[roundIndex]
      if (!board) {
        board = new BoardState(context.config.boardSize, startingMark)
        nextRoundBoards[roundIndex] = board
      } else {
        board.reset(startingMark)
      }
      return {
        state: {
          ...current,
          phase: 'running',
          currentRound: round,
          activePlayer: startingPlayer,
          board,
          roundBoards: nextRoundBoards,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'running' },
          { type: 'board:update', board },
        ],
      }
    },
    ABORT: (current, action) => {
      const { reason } = action as Extract<GameLoopAction, { type: 'ABORT' }>
      const message = reason ?? 'Match aborted'
      return {
        state: {
          ...current,
          phase: 'error',
          lastError: message,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'error' },
          {
            type: 'error',
            message,
          },
        ],
      }
    },
  },
  completed: {
    CONFIGURE: (current, action) => {
      const { config } = action as Extract<GameLoopAction, { type: 'CONFIGURE' }>
      const board = new BoardState(config.boardSize)
      return {
        state: {
          ...current,
          phase: 'idle',
          currentRound: 0,
          totalRounds: config.totalRounds,
          activePlayer: null,
          board,
          roundBoards: [],
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
      const { config } = action as Extract<GameLoopAction, { type: 'CONFIGURE' }>
      const board = new BoardState(config.boardSize)
      return {
        state: {
          ...current,
          phase: 'idle',
          currentRound: 0,
          totalRounds: config.totalRounds,
          activePlayer: null,
          board,
          roundBoards: [],
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

export interface GameLoopControllerOptions {
  loadModelSession?: (modelId: number) => Promise<unknown>
  onPhaseChange?: (phase: GameLoopPhase) => void
}

export function createGameLoopController(
  options: GameLoopControllerOptions = {},
): GameLoopController {
  let state = createInitialState()
  let config: MatchConfig | null = null
  const { loadModelSession } = options
  const phaseCallback = options.onPhaseChange
  const modelSessions = new Map<number, unknown>()
  const listeners = new Set<
    (next: GameLoopState, event?: GameLoopEvent) => void
  >()

  const notify = (event?: GameLoopEvent): void => {
    const snapshot = state
    if (event?.type === 'phase:change' && phaseCallback) {
      phaseCallback(event.phase)
    }
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

  const primeModelSessions = async (
    matchConfig: MatchConfig,
  ): Promise<void> => {
    if (!loadModelSession) {
      return
    }
    const uniqueModelIds = new Set<number>([
      matchConfig.modelAId,
      matchConfig.modelBId,
    ])
    await Promise.all(
      Array.from(uniqueModelIds).map(async (modelId) => {
        if (modelSessions.has(modelId)) {
          return
        }
        const session = await loadModelSession(modelId)
        modelSessions.set(modelId, session)
      }),
    )
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
    if (!config) {
      throw new Error('Match configuration missing. Call configure() first.')
    }
    try {
      await primeModelSessions(config)
      dispatch({ type: 'BEGIN_ROUND', round: 1 })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to initialize match'
      dispatch({ type: 'ERROR', message })
      throw error
    }
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
    notify()
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
