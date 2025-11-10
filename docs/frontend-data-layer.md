# Frontend Data Layer

## Round Result Submission Helper

**Location:** `apps/frontend/src/lib/round-results.ts`

The `submitRoundResult(round: RoundResult)` helper is the single entry point the UI uses to persist recap dialog data to `/api/matches/complete`. It wraps fetch, schema validation, retry/backoff logic, match identifier storage, and event dispatching so components can focus on building the payload and reacting to outcomes.

### Request payload

- Accepts a `RoundResult` object from `@arena/schema`. Route code should prefer the `buildRoundResultPayload(options)` helper (`apps/frontend/src/lib/round-results/build-round-result-payload.ts`) to convert `RoundSummary`, move history, board size, player labels, and the `rematchRequested` flag into the correct shape.
- Automatically omits `matchId` on the first round and injects the cached value on later rounds. The helper keeps an `activeMatchId` in memory and mirrors it to `localStorage` under `tic-tac-toe:matchId` so refreshes can resume the same match series.

### Return value

Resolves with a parsed `RoundResultResponse`:

```ts
type RoundResultResponse = {
  matchId: string
  roundId: string
  moveCount: number
  persistedAt: string
  idempotent: boolean
}
```

Components (e.g., the recap dialog footer) can display `persistedAt` immediately without another fetch by capturing the resolved value.

### Error handling & telemetry

- **Client/Server errors**: The helper throws an `ApiError` when the backend responds with a 4xx/5xx. It also emits `ROUND_RESULT_ERROR_EVENT` (`round-result:submission-error`) so global listeners can show a toast and, when `retryable` is `true`, surface a retry CTA.
- **Match lifecycle events**: A `MATCH_NOT_FOUND` response clears all cached IDs and emits `round-result:match-not-found`. `ROUND_CONFLICT` emits `round-result:round-conflict` so the UI can warn that the round already exists.
- **Retries**: 5xx/network failures trigger exponential backoff (250 ms, 1 s, 4 s). If all attempts fail, the helper logs to Sentry and emits the general error event with `retryable: true`.
- **Retry intent**: When a user taps “Retry submission” in the toast, the app dispatches `ROUND_RESULT_RETRY_REQUEST_EVENT` and interested components can re-run their payload builder + helper call.

### Usage example

```ts
const payload = buildRoundResultPayload({
  summary: latestRoundSummary,
  moves: roundMoves,
  boardSize,
  totalRounds,
  playerOneModel: modelA?.name,
  playerTwoModel: modelB?.name,
  rematchRequested,
})

if (payload) {
  const response = await submitRoundResult(payload)
  setRoundSaves((prev) => ({ ...prev, [payload.currentRound]: response }))
}
```

Wrap the call in a guard (`roundSubmitPending`) so recap controls stay disabled until the promise settles.

### When to rebuild the payload

- Call the helper when the recap dialog closes (dismiss or confirm) so the payload represents the user’s final intent.
- For rematches, pass `rematchRequested: true` so the backend records the CTA choice alongside the round data.

By centralizing collection of match metadata, retries, and event dispatching inside `submitRoundResult`, the rest of the UI only needs to shape the raw gameplay data once and listen for the high-level events.
