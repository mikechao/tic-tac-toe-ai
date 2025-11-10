# Transformers.js Integration Notes

## SmolLM2-360M-Instruct reference

| detail | value |
| --- | --- |
| Model ID | `HuggingFaceTB/SmolLM2-360M-Instruct` |
| Parameter count | ~0.4B (360M) |
| Context window | 8,192 tokens |
| License | Apache-2.0 |

The Hugging Face model card confirms the Apache-2.0 license and 360M-parameter footprint, keeping it suitable for redistribution-free local inference scenarios. External benchmarking trackers list an 8K context window, which sets the ceiling for arena prompt construction and memory budgeting. citeturn0search1turn0search2

## Local caching & repository policy alignment

- Transformers.js downloads weights from the Hub on first use, then stores them in the browser cache (Cache API/IndexedDB) so subsequent sessions reuse the bytes without bundling them in our repo. citeturn2search1
- The environment module keeps `env.useBrowserCache` enabled by default, meaning our app-side integration can rely on local Cache API writes while still honoring repo rules against committing large binaries. If stricter storage is required, we can override `env.cacheDir` or `env.allowRemoteModels`, but no change is needed for default client-side caching. citeturn2search2
- Because weights stay in per-user storage (Cache API/IndexedDB or `.cache` when running Node tooling), we avoid shipping proprietary artifacts while still guaranteeing offline reuse once downloaded. Documenting this behavior here gives product and compliance reviewers a single reference when auditing new local models.

## Frontend bundler readiness (Vite)

- `apps/frontend/vite.config.ts` currently uses stock Vite 5 + React plugins with no custom asset handling. Vite already supports `new URL('./worker.ts', import.meta.url)` out of the box, so the Transformers worker can live beside the provider without extra plugins; just ensure the file sits inside `src/integrations/transformers/`. 
- WASM blobs pulled in by `@huggingface/transformers` ship as ES modules; per Vite guidance we should add `optimizeDeps.exclude: ['@huggingface/transformers']` (and the companion `@huggingface/transformers/tokenizers` package once introduced) so pre-bundling doesn't choke on their dynamic `fs` fallbacks. No `worker.loaders` override is needed because Vite in module mode already emits ESM workers, but we should document that WebGPU-only environments must run the app in browsers that expose `navigator.gpu`.
- Action item: patch `apps/frontend/vite.config.ts` with an `optimizeDeps.exclude` array and, if transformers pulls in WASM via `new URL('*.wasm', import.meta.url)`, add `assetsInclude: ['**/*.wasm']` to be safe. We'll revisit once the provider lands, but for now there are no blockers.

## Device & dtype strategy

- We treat Transformers.js as a WebGPU-only option for now. If `doesBrowserSupportTransformersJS()` returns `false`, the SmolLM2 card stays disabled with messaging like “Requires WebGPU-capable Chromium”; we do not fall back to `gpu`/`cpu` because CPU inference on 360M params blocks the UI and fails our UX SLAs.
- When support is detected, we initialize the model with `{ device: 'webgpu', dtype: 'q4f16' }` to balance download size and throughput. `q4f16` keeps VRAM <2 GB and matches Xenova’s recommended quantization for SmolLM2; if the SDK exposes better auto-quantization later we can revisit.
- Future enhancement: detect `navigator.gpu` but missing required features (e.g., `shaderF16`). If that surfaces in testing we can consider a `device: 'gpu'` fallback with a warning banner, but it remains explicitly out-of-scope for this rollout.
