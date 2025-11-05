export type MatchStartEvent = {
  matchId: number
  modelAId: number
  modelBId: number
  totalRounds: number
  difficulty: string
}

export type MatchUpdateEvent = {
  matchId: number
  completedGames: number
  currentGameIndex: number
  isComplete: boolean
}

export type MatchEndEvent = MatchUpdateEvent

export type GameRecordedEvent = {
  matchId: number
  gameId: number
  round: number
  winner: 'modelA' | 'modelB' | 'tie'
}

export type MoveRecordedEvent = {
  gameId: number
  moveId: number
  moveIndex: number
  position: number
  actor: 'modelA' | 'modelB'
}

export type LeaderboardUpdateEvent = {
  modelIds: number[]
}

export type BackendEvents = {
  'match:start': MatchStartEvent
  'match:update': MatchUpdateEvent
  'match:end': MatchEndEvent
  'game:recorded': GameRecordedEvent
  'move:recorded': MoveRecordedEvent
  'leaderboard:update': LeaderboardUpdateEvent
  error: { message: string; context?: Record<string, unknown> }
}

type EventPayload<EventName extends keyof BackendEvents> =
  BackendEvents[EventName]

type AnyListener = (payload: BackendEvents[keyof BackendEvents]) => void
const listeners = new Map<keyof BackendEvents, Set<AnyListener>>()

export function emitEvent<EventName extends keyof BackendEvents>(
  eventName: EventName,
  payload: EventPayload<EventName>,
): void {
  const eventListeners = listeners.get(eventName)
  if (!eventListeners) {
    return
  }
  for (const listener of eventListeners) {
    try {
      ;(listener as (data: EventPayload<EventName>) => void)(payload)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Event listener error', { eventName, error })
    }
  }
}

export function onEvent<EventName extends keyof BackendEvents>(
  eventName: EventName,
  listener: (payload: BackendEvents[EventName]) => void,
): () => void {
  let eventListeners = listeners.get(eventName)
  if (!eventListeners) {
    eventListeners = new Set()
    listeners.set(eventName, eventListeners)
  }
  const storedListener = listener as AnyListener
  eventListeners.add(storedListener)
  return () => {
    listeners.get(eventName)?.delete(storedListener)
  }
}
