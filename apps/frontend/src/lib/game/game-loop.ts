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
})

export function createGameLoopController(): GameLoopController {
  let state = createInitialState()
  const listeners = new Set<
    (next: GameLoopState, event?: GameLoopEvent) => void
  >()

  const notify = (event?: GameLoopEvent): void => {
    for (const listener of listeners) {
      listener(state, event)
    }
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

  const configure = (_config: MatchConfig): void => {
    throw new Error('configure not implemented yet')
  }

  const start = async (): Promise<void> => {
    throw new Error('start not implemented yet')
  }

  const pause = (): void => {
    throw new Error('pause not implemented yet')
  }

  const resume = (): void => {
    throw new Error('resume not implemented yet')
  }

  const abort = (_reason?: string): void => {
    throw new Error('abort not implemented yet')
  }

  const nextRound = (): void => {
    throw new Error('nextRound not implemented yet')
  }

  const dispose = (): void => {
    listeners.clear()
    state = createInitialState()
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
