# Models Page Extraction Plan

## Goals
- Move model discovery, download, and state messaging out of `apps/frontend/src/components/arena/MatchControls.tsx` into the dedicated route file `apps/frontend/src/routes/models.tsx`.
- Give users a clear entry point to manage on-device Gemini Nano availability, mirroring the visual language already established in Arena (e.g., Round progress indicator, Magic UI cards).
- Ensure the page gracefully handles browsers without built-in AI support while encouraging fallbacks (cloud inference, documentation links).

## Current Coupling In `MatchControls`
- The control card imports `localAIModels` and filters them inline, keeping provider metadata, selection components, and Gemini readiness messaging tightly bound to match orchestration.
- Gemini readiness is inferred indirectly via `useGeminiContext().status === 'ready'`, which conflates “model downloaded” with “match can start.”
- Model-specific UI (select dropdown, availability text) lives in the same component as round/timeout inputs, making it hard to reuse when we need richer model management tools on a new page.

## Proposed `models.tsx` Responsibilities
1. **Data plumbing**
   - Import `localAIModels` and expose richer metadata (model size, last updated, docs link) sourced from `apps/frontend/src/data/models.ts`.
   - Provide a `ModelCard` component per entry with summary details and controls for download/manage actions.
2. **Built-in AI detection**
   - Feature-detect with `const hasBuiltInAI = typeof window !== 'undefined' && 'LanguageModel' in window`.
   - On mount, call `await LanguageModel.availability(options)` to retrieve `"unavailable" | "downloadable" | "downloading" | "available"`.citeturn0search0turn0search3
   - Cache availability per `ModelId` (even though Chrome currently exposes a single Gemini Nano download) so the UI can evolve if more models arrive.
3. **Download orchestration**
   - Require an explicit user gesture (click/tap) before invoking `LanguageModel.create({ monitor })`. Check `navigator.userActivation.isActive` before calling to satisfy Chrome’s user-activation requirement.citeturn0search0
   - Wire the `monitor` callback’s `downloadprogress` events into local state shaped as `{ receivedBytes, totalBytes, percent, phase }`.citeturn0search1
   - When `availability` transitions to `"available"`, flip the CTA label to “Ready” and disable the button unless we need a “Reset” affordance.
4. **Progress indicator parity**
   - Reuse the styling from the MatchBoard round bar (`h-2 rounded-full bg-white/10` container + gradient inner bar) to visualize download percent for each model card.
   - Provide an indeterminate shimmer after 100% while the browser extracts/loads the model (per Chrome guidance).citeturn0search1
5. **Support matrix messaging**
   - If `hasBuiltInAI` is false or `availability()` resolves to `"unavailable"`, show a Magic UI `StateMessage` explaining the requirements (OS, disk, RAM) with a link to Chrome’s Prompt API hardware guidelines.citeturn0search3
   - Offer optional “Learn how to enable built-in AI” link pointing to `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` instructions.

## Interaction & UI States
| State | Detection Result | CTA Label | Progress UI | Notes |
| --- | --- | --- | --- | --- |
| Unsupported | No `LanguageModel` global or `availability === 'unavailable'` | `Not Supported` (disabled) | Hidden | Provide fallback guidance / link to docs. |
| Downloadable | `availability === 'downloadable'` | `Download` | Hidden until click | CTA triggers `LanguageModel.create({ monitor })`. |
| Downloading | `monitor` emits progress | `Downloading…` | Round-style bar showing `percent` | Show remaining GB if `totalBytes` available. |
| Finalizing | Progress hit 100% but availability still `'downloading'` | `Installing…` | Bar locked at 100% with subtle pulse | Keep user engaged until API flips. |
| Ready | `availability === 'available'` | `Ready` | Full bar, accent glow | Offer `Launch Arena` shortcut or `Re-check` button. |

## Implementation Steps
1. **Extract shared hooks**
   - Create `useLocalModelAvailability(modelId, options)` in `apps/frontend/src/lib/hooks/` (or colocated under `routes/models/`) to encapsulate detection, polling, and progress state.
   - Export matching TypeScript types (`BuiltInAIState`, `DownloadPhase`).
2. **Build route layout**
   - Compose a top-level `Hero` describing on-device play benefits, a grid of `ModelCard`s, and a sidebar callout that links back to Arena controls once models are ready.
   - Keep TanStack route loader minimal; most logic happens client-side after hydration because `window.LanguageModel` is undefined during SSR.
3. **Mirror styles from MatchBoard**
   - Pull the progress bar markup into a tiny component (e.g., `RoundProgressBar`) so both `MatchBoard` and `ModelCard` can share it, preventing style drift.
4. **Wire MatchControls to new source**
   - After the page lands, trim `MatchControls` to a lightweight selector: it should consume the shared availability hook (or context) so the Start Match button stays disabled until at least one model is `Ready`.
5. **Testing & follow-up**
   - Add a Vitest suite that mocks `window.LanguageModel` and asserts state transitions (downloadable → downloading → available).
   - Manual QA instructions: use Chrome’s `--user-data-dir` trick to simulate a fresh profile, observe download progress, and confirm the progress bar matches MatchBoard visuals.citeturn0search1

## Open Questions
- Should we store download progress globally (e.g., in context) so Arena can reflect it without visiting the models page?
- Do we need server-side telemetry to know how often users get stuck in “downloadable” because of storage limits?
- Will we eventually expose multiple local models (e.g., Phi-3 on Edge)? If so, the data model should support browser-specific detection logic.

## References
- Chrome “Get started with built-in AI” (model availability statuses, user activation rules).citeturn0search0
- Chrome “Inform users of model download” (monitor-based progress UX).citeturn0search1
- Chrome “Prompt API” hardware requirements and `LanguageModel.availability()` workflow.citeturn0search3
