# Plan: Add HuggingFaceTB/SmolLM2-360M-Instruct

## Phase 1 – Requirements & capability gating
- [ ] Re-read `docs/built-in-ai-transformer-README.md` sections **Basic Usage**, **Advanced Usage (Web Worker)**, and **Download Progress Tracking** to lock in the recommended `transformersJS("HuggingFaceTB/SmolLM2-360M-Instruct", { device: "webgpu" })` defaults, worker scaffolding, and progress APIs.
- [ ] Confirm the Hugging Face model card (size, license, context window) and ensure its weights are cached locally by Transformers.js without violating repository policies; capture decisions in a project-owned note such as `docs/transformers-js-integration.md` (or append to `docs/TECH_STACK.md`) instead of the upstream library README.
- [ ] Audit the Vite frontend bundler (`apps/frontend/vite.config.ts`) for Web Worker + WebGPU readiness (i.e., `new URL('./worker.ts', import.meta.url)` support & wasm asset handling) and list any needed config toggles (e.g., `worker.loaders`, `optimizeDeps.exclude`).
- [ ] Decide on device fallbacks (`webgpu` → `gpu` → `cpu`) and dtype (`q4f16` vs `fp16`) strategies so the provider can degrade gracefully when `doesBrowserSupportTransformersJS()` returns false.

## Phase 2 – Data & provider scaffolding
- [ ] Extend `apps/frontend/src/data/models.ts`: replace `BuiltInAIProvider` type with a broader `LocalModelProvider` union like `'chrome-builtin' | 'edge-builtin' | 'transformers-js'` (since Transformers.js is not a browser built-in provider), append the SmolLM2 record using the next available `ModelId` (coordinate with backend and update `packages/schema/src/index.ts` if `ModelId` is a defined type/enum, likely `2`), and expose helper metadata like estimated download size for UI copy.
- [ ] Confirm `@built-in-ai/transformers-js`’s peer requirements match the repo’s `ai` SDK version (currently `^5.0.87`) and document any needed upgrades or adapters before wiring dependencies.
- [ ] Create a dedicated `apps/frontend/src/integrations/transformers/provider.ts` that wraps `@built-in-ai/transformers-js`, exposes `detectSupport`, `checkAvailability`, `startDownload`, `reset`, and `getPrimaryModelId`, then register it via `registerModelProvider` alongside `chrome-builtin`; this provider should assume entirely client-side inference (no browser built-in assumptions).
- [ ] Stand up a separate `TransformersJSProvider` context (mirroring `BuiltInAIProvider`) to own state for Transformers.js downloads, then have both providers feed a shared `LocalModelRegistry` or `registerModelProvider` flow so `useLocalModelAvailability` can read/write statuses without overloading the existing Gemini-specific context.
- [ ] Add workspace dependency wiring (`pnpm add -w @built-in-ai/transformers-js`) plus any required type packages, and verify lockfile + Turbo scopes stay consistent.

## Phase 3 – Download lifecycle & worker plumbing
- [ ] Add `apps/frontend/src/integrations/transformers/worker.ts` using the README's `TransformersJSWorkerHandler` example and update Vite to include it in the bundle.
- [ ] Update `apps/frontend/vite.config.ts` with any required `optimizeDeps.exclude`/`ssr.noExternal` entries (e.g., `@huggingface/transformers`) or asset loaders so WASM + worker chunks load correctly, mirroring the README guidance.
- [ ] Implement a `useTransformersModel` hook that instantiates `transformersJS("HuggingFaceTB/SmolLM2-360M-Instruct", { worker, device, initProgressCallback })`, surfaces `availability()`/`createSessionWithProgress()`, and pushes progress events into the shared model-state map; ensure `initProgressCallback` converts the README's 0-1 `progress` value to 0-100 `percent` for `ModelDownloadProgress`.
- [ ] Research Transformers.js cache storage mechanism (likely browser IndexedDB under the `@huggingface/transformers` namespace) and implement a cache-clearing utility for the provider's `reset()` method to support retry flows.
- [ ] Wire `startDownload` for the new provider to honor user gestures, call `createSessionWithProgress`, and update `RoundProgressBar` with `%` just like Gemini; include retry logic in the error handler that invokes the cache-clearing utility before re-attempting download.
- [ ] Capture and log download telemetry (size, duration, failures) through Sentry similarly to Gemini so ops can trace large-model issues.

## Phase 4 – Gameplay & inference integration
- [ ] Update arena UI consumers (`MatchControls`, `MatchBoard`, `MatchTelemetry`, leaderboard demo data) to surface the SmolLM2 option, ensuring vendor badges, tooltips, and opponent filters understand the new provider.
- [ ] Implement inference plumbing: when the SmolLM2 model is selected, call `streamText`/`generateText` with the initialized Transformers.js instance (entirely client-side). If `doesBrowserSupportTransformersJS()` is false, disable or gray out the model with a “WebGPU required” (or “slow CPU fallback”) message instead of attempting a backend fallback.
- [ ] Ensure match result payloads include the new `player*Model` strings so backend persistence + analytics can differentiate Gemini vs SmolLM2 (update any schema enums or type guards if applicable).
- [ ] Add guardrails for resource usage (e.g., limit concurrent matches, expose a “model busy” toast) since Transformers.js can tie up the main thread without a worker.
- [ ] Update `docs/component-architecture.md` (or a new architecture subsection) to document how the Gemini and Transformers.js providers coexist, where contexts are mounted, and how arena components select between them.

## Phase 5 – Validation, docs, and rollout
- [ ] Add Vitest coverage for the provider layer (mock `transformersJS`) plus React tests that verify the Models page shows SmolLM2 download states and the retry button routes through the new provider, then run an integration test (or manual harness) that exercises `streamText` inside the arena game loop to ensure moves stream correctly end-to-end.
- [ ] Capture client-side performance benchmarks (first-token latency, tokens/sec) versus Gemini Nano so UX copy can set expectations and throttling thresholds.
- [ ] Measure bundle-size impact using Vite's built-in build stats or by adding `rollup-plugin-visualizer` to confirm Transformers.js' dynamic chunks stay within acceptable budgets; document mitigation steps if they spike.
- [ ] Test across Chrome Canary, Edge Dev, and a non-WebGPU browser (Firefox stable) to confirm capability detection, disabled-state messaging, and CPU fallback UX all behave as designed.
- [ ] Document setup in `docs/transformers-js-integration.md` (or append to `docs/TECH_STACK.md`) covering installation steps, worker file path, device fallback behavior, and troubleshooting tips; mention the new model in `docs/remaining-tasks.md` if follow-up work remains.
- [ ] Run `pnpm lint`, `pnpm test`, `pnpm build` in both `apps/frontend` and `apps/backend` to confirm the dependency + worker changes don’t break the build pipeline.
- [ ] Coordinate release notes (CHANGELOG or PR description) that call out the new local inference option, browser requirements, and troubleshooting tips for WebGPU/worker failures.
