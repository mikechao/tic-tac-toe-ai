# Models Page Implementation Plan

## 1. Shared Data & Types
- [x] Add a `provider` discriminator field (currently `'chrome-builtin'`) to `apps/frontend/src/data/models.ts` so models can declare which built-in AI provider handles them; keep additional metadata (size, release notes, docs link) on the backlog.
- [x] Define `BuiltInAIState`, `DownloadPhase`, and `ModelDownloadProgress` types in a shared module (e.g., `apps/frontend/src/lib/models/types.ts`).
- [x] Export a helper to normalize provider-specific capability flags for future model additions.
- [x] Define a `ModelProvider` interface that abstracts provider-specific detection, availability checking, and download orchestration so adding new built-in AI sources (Edge, Firefox, etc.) only requires implementing this interface.

## 2. Built-in AI Detection Hook
- [x] Extend `BuiltInAIProvider` (formerly `GeminiProvider`) to expose per-model state so download progress is centralized and accessible to both the models page and Arena components without requiring users to visit the models page first.
 - [x] Create `useLocalModelAvailability(modelId, options)` as a thin wrapper around the extended `useBuiltInAI()` to avoid duplicating status/progress/startDownload/retry logic.
- [x] Implement feature detection (`typeof window !== 'undefined' && 'LanguageModel' in window`) and return `NotSupported` when missing.
- [x] Wrap `LanguageModel.availability()` and store the status in state keyed by `ModelId`.
- [x] Wire `LanguageModel.create({ monitor })` behind a user-gesture guard (`navigator.userActivation.isActive`) and expose a `startDownload()` callback.
- [x] Capture `downloadprogress` events into `{ receivedBytes, totalBytes, percent, phase }` and surface them through the hook (populate bytes as `null` until providers expose them).
- [x] Emit a final `Ready` status once `availability()` reports `available`, with optional re-check polling.
- [x] Audit and refactor `GeminiSupportGate.tsx` to consume `useLocalModelAvailability`, exporting the unsupported-browser notice so the models page can reuse the same messaging without blocking the entire route.
- [x] Add Sentry error tracking for download failures with contextual tags: `error.type` (storage_constraint, network_error, unsupported_hardware), `browser.version`, `storage.available`, `model.id`, and `model.size` to help diagnose common failure modes in production.

## 3. Built-in AI Context Architecture
- [x] Review `apps/frontend/src/integrations/gemini/context.tsx` to catalog the data already exposed by `BuiltInAIProvider` (`status`, `progress`, `startDownload`, `retry`, `error`).
 - [x] Rename `GeminiProvider` to `BuiltInAIProvider` so the provider name matches its multi-model role, and replace existing `useGeminiContext` consumers with the new `useBuiltInAI()` hook.
- [x] Extend the provider to support per-model state tracking (keyed by `ModelId`) while maintaining backward compatibility with the existing single-model API used by MatchControls.
- [x] Add selector helpers or context methods (e.g., `getModelStatus(modelId)`, `getModelProgress(modelId)`, `getModelProvider(modelId)`) so the models page and MatchControls can subscribe to specific model progress without causing unnecessary re-renders.
- [x] Ensure the models page CTA routes to the appropriate provider implementation based on the model's `provider` field (e.g., Chrome's `LanguageModel` API for Gemini, Edge's equivalent for Phi-3) so user-gesture gating, permission errors, and reset logic remain centralized but provider-agnostic.
- [x] Wrap error handling in the provider's download paths with Sentry capture calls, enriching errors with contextual tags/metadata before reporting.
- [x] Update documentation in `docs/models-page.md` to reflect the multi-provider context approach so future work stays aligned.

## 4. Shared Progress Indicator
- [x] Extract the MatchBoard round progress markup into a reusable `RoundProgressBar` component while preserving the same gradient styling (match the request that download progress reuses this look).
- [x] Accept props for `value`, `isIndeterminate`, and optional accent classes so the component can render both match-round and download states without duplicating logic.
- [x] Replace the inlined MatchBoard markup with the new component and use the same component in the models page download cards to keep visual parity.

## 5. `models.tsx` Route UI
- [x] Create a hero section that explains on-device Gemini benefits (privacy, latency, rematch readiness) without forcing navigation away from the page.
- [x] Render a stacked list of `ModelCard`s sourced from `localAIModels`, each consuming the availability hook.
- [ ] Add CTA button states (`Download`, `Downloading…`, `Installing…`, `Ready`, `Not Supported`) based on hook outputs.
- [ ] Show the `RoundProgressBar` under each card while `phase` is downloading or finalizing.
- [ ] Provide status messaging for unsupported browsers (e.g., Magic UI `StateMessage`) when the hook reports `NotSupported` or `Unavailable`, including the explicit `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` link called out in `docs/models-page.md`.
- [ ] Include a sidebar callout that prompts users to launch a match once at least one model is ready.

## 6. MatchControls Integration
- [ ] Update `apps/frontend/src/components/arena/MatchControls.tsx` to consume the centralized `BuiltInAIProvider` state (via `useBuiltInAI()`) for observing download progress without duplicating download UI.
 - [ ] Ensure `MatchControls` no longer owns model discovery/download messaging; gate match start on the per-model readiness exposed by `useBuiltInAI()` so both selected models report `Ready`.
- [ ] If models are not ready, show inline status with download progress (e.g., "Downloading Gemini Nano: 45%") and a link to the Models page for full management UI.
- [ ] Ensure model dropdowns reflect any newly added metadata (provider, variant, status chips) without reintroducing download controls.

## 7. Testing & QA
- [ ] Write Vitest specs for the availability hook, mocking `window.LanguageModel` to cover each status transition.
- [ ] Add component tests (or Storybook stories if available) for `ModelCard` covering unsupported, downloadable, downloading, and ready states.
- [ ] Test Sentry error capture by simulating download failures (mock storage quota exceeded, network timeout, unsupported hardware) and verify errors appear in Sentry with correct tags and context.
- [ ] Document manual QA steps in `docs/models-page.md` (fresh Chrome profile, observe download progress, confirm UI parity with MatchBoard).
- [ ] Verify lint/format (`pnpm lint`, `pnpm format`) and run `pnpm test` before merging.

## 8. Follow-up Questions
- [ ] Consider whether to surface background download progress in the AppHeader or via toast notifications when users are away from the Models page.
- [ ] Evaluate creating a Sentry dashboard specifically for model download health metrics (success rate, common error types, browser/OS distribution of failures).
- [ ] Document the process for adding a new built-in AI provider (e.g., Edge Phi-3, Firefox Llamafile) in `docs/models-page.md` including: implementing the `ModelProvider` interface, adding detection logic, updating `localAIModels` data, and wiring into the context.

### Context Notes
- BuiltInAIProvider currently exposes: `status` (`checking`, `downloadable`, `downloading`, `ready`, `unsupported`, `error`), `progress` (0–1), `model` (loaded `BuiltInAIChatLanguageModel`), `error`, `retry()`, `startDownload()`, `modelStates` keyed by `ModelId`, and selector helpers (`getModelState`, `getModelStatus`, `getModelProgress`) plus the `primaryModelId`. This confirms the data surface for subsequent refactors.
- Provider/consumer naming has been updated: `BuiltInAIProvider`, `useBuiltInAI()`, and `useBuiltInAIModel()` now back `MatchControls`, `GeminiSupportGate`, and `useLocalModelAvailability`, eliminating the old `useGeminiContext` references.
