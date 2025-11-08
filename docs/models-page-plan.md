# Models Page Implementation Plan

## 1. Shared Data & Types
- [ ] Extend `apps/frontend/src/data/models.ts` with any additional metadata needed (size, release notes, docs link).
- [ ] Define `BuiltInAIState`, `DownloadPhase`, and `ModelDownloadProgress` types in a shared module (e.g., `apps/frontend/src/lib/models/types.ts`).
- [ ] Export a helper to normalize provider-specific capability flags for future model additions.

## 2. Built-in AI Detection Hook
- [ ] Scaffold `useLocalModelAvailability(modelId, options)` (likely under `apps/frontend/src/routes/models/` or `src/lib/hooks/`).
- [ ] Implement feature detection (`typeof window !== 'undefined' && 'LanguageModel' in window`) and return `NotSupported` when missing.
- [ ] Wrap `LanguageModel.availability()` and store the status in state keyed by `ModelId`.
- [ ] Wire `LanguageModel.create({ monitor })` behind a user-gesture guard (`navigator.userActivation.isActive`) and expose a `startDownload()` callback.
- [ ] Capture `downloadprogress` events into `{ receivedBytes, totalBytes, percent, phase }` and surface them through the hook.
- [ ] Emit a final `Ready` status once `availability()` reports `available`, with optional re-check polling.

## 3. Shared Progress Indicator
- [ ] Extract the round progress bar markup from `apps/frontend/src/components/arena/MatchBoard.tsx` into a reusable `RoundProgressBar` component.
- [ ] Accept props for `value`, `isIndeterminate`, and optional accent classes so both MatchBoard and the models page can reuse it.
- [ ] Replace the inlined MatchBoard markup with the new component to keep visuals consistent.

## 4. `models.tsx` Route UI
- [ ] Create a hero section that explains on-device Gemini benefits and links back to Arena.
- [ ] Render a grid of `ModelCard`s sourced from `localAIModels`, each consuming the availability hook.
- [ ] Add CTA button states (`Download`, `Downloading…`, `Installing…`, `Ready`, `Not Supported`) based on hook outputs.
- [ ] Show the `RoundProgressBar` under each card while `phase` is downloading or finalizing.
- [ ] Provide status messaging for unsupported browsers (e.g., Magic UI `StateMessage` with docs link) when the hook reports `NotSupported` or `Unavailable`.
- [ ] Include a sidebar callout that prompts users to launch a match once at least one model is ready.

## 5. MatchControls Integration
- [ ] Update `apps/frontend/src/components/arena/MatchControls.tsx` to consume the shared availability hook/context instead of directly inferring readiness from `useGeminiContext`.
- [ ] Keep the Start Match button disabled until the selected models report `Ready`.
- [ ] Ensure model dropdowns reflect any newly added metadata (provider, variant, status chips).

## 6. Testing & QA
- [ ] Write Vitest specs for the availability hook, mocking `window.LanguageModel` to cover each status transition.
- [ ] Add component tests (or Storybook stories if available) for `ModelCard` covering unsupported, downloadable, downloading, and ready states.
- [ ] Document manual QA steps in `docs/models-page.md` (fresh Chrome profile, observe download progress, confirm UI parity with MatchBoard).
- [ ] Verify lint/format (`pnpm lint`, `pnpm format`) and run `pnpm test` before merging.

## 7. Follow-up Questions
- [ ] Decide whether to centralize download progress in a context so Arena components can observe it without visiting the models page.
- [ ] Evaluate telemetry hooks to capture when users fail to download because of storage constraints.
- [ ] Plan for future non-Chrome models (Edge/Firefox) by abstracting capability detection logic.
