# Front-to-back integration plan

## 1. Build the round-result SDK helper

1.1 [x] Create `submitRoundResult` (or similar) inside the frontend data layer that formats the payload per `RoundResult` schema and POSTs to `/api/matches/complete`.
1.2 [x] Ensure the helper omits `matchId` on the first round submission and attaches it once the backend response includes it.
1.3 [x] Parse the JSON response and return `{ matchId, roundId, moveCount, persistedAt, idempotent }` to the caller.

## 2. Persist identifiers between rounds

2.1 [x] Store the first `matchId` returned by the backend in both memory and `localStorage` (e.g., key `tic-tac-toe:matchId`).
2.2 [x] On every subsequent helper call, read the cached `matchId`; if present, include it in the payload, otherwise treat the request as the first round.
2.3 [x] When the backend returns `MATCH_NOT_FOUND`, clear the cached `matchId` so the next submission restarts the session.

## 3. Implement retry & idempotency handling

3.1 [x] Wrap POST attempts with exponential backoff (recommended delays: 250 ms, 1 s, 4 s) and stop after three tries.
3.2 [x] If a retry receives a `200`/`201` with `idempotent: true`, treat the save as complete and halt further retries.
3.3 [x] Log or surface telemetry when retries exhaust without success so we can monitor flaky networks.

## 4. Surface backend errors to the UI

4.1 [ ] Show a user-friendly toast when `ROUND_CONFLICT` is returned (“This round was already recorded”).
4.2 [ ] For `MATCH_NOT_FOUND`, clear cached IDs and prompt the user to restart the match.
4.3 [ ] Bubble any other 4xx/5xx errors to the UI with fallback messaging and optional retry CTA.

## 5. Wire the recap dialog/workflow

5.1 [ ] Invoke the helper when the recap dialog is confirmed/dismissed, passing the latest board data, winner, and round metadata.
5.2 [ ] Use the helper response to update the recap UI immediately (e.g., show saved timestamp, move count) without another fetch.
5.3 [ ] Disable the recap confirm button while a submission is in flight to prevent duplicate requests.

## 6. Documentation & verification

6.1 [ ] Document the helper usage (arguments, return value, error states) in the frontend README or data-layer docs.
6.2 [ ] Add unit tests or integration tests that mock the backend to cover success, idempotent retry, `ROUND_CONFLICT`, and `MATCH_NOT_FOUND` scenarios.
6.3 [ ] Demo the full flow (play round → recap dialog save → verify DB row) before connecting to Hyperdrive/Xata.
