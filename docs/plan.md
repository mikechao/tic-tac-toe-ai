# AI Arena Development Plan

## Overview
Build a playful browser-based arena where Gemini Nano LLM agents face off in tic tac toe matches, track multi-round session data up to 100 games, and surface cumulative leaderboard stats with responsive, accessible UI and engaging feedback.

## 1. Project Setup
- [x] Repository initialization and tooling
  - Create Turborepo-based monorepo with `pnpm` workspaces; establish `apps/frontend` and `apps/backend` directories.
  - Configure base `turbo.json`, root `package.json`, and shared TypeScript/ESLint/Biome configs.
  - Add `.editorconfig`, `.eslintignore`, `.gitignore`, and commit linting (Conventional Commits).
- [x] Package manager and workspace
  - Configure `pnpm-workspace.yaml` including apps and future `packages/*`.
  - Set Node version via `.nvmrc`/`.tool-versions` and install baseline dependencies per app (Vite/React frontend, Hono/Drizzle backend).
- [x] Development environment configuration
  - Configure VS Code workspace settings (format on save, recommended extensions).
  - Set up environment variable templates (`.env.example`) for backend URL and feature flags.
  - Document required secrets: `DATABASE_URL`, `SENTRY_DSN`.
  - Describe Wrangler configuration with Cloudflare Hyperdrive binding (`[[hyperdrive]]`) and environment-specific sections for dev/staging/production.
  - Declare upstream Postgres provider (PlanetScale) used by Hyperdrive; capture credentials and region choice.
- [x] Backend service scaffold
  - Initialize Cloudflare Worker project with Hono (TypeScript) using Wrangler; configure ESLint/Biome.
  - Establish directory structure (`src/routes`, `src/services`, `src/lib`, `drizzle/` migrations).
  - Configure `wrangler.toml` environments (dev, staging, prod) with Hyperdrive binding names and secret placeholders; document `wrangler secret put` workflow.
  - Enable local development via `wrangler dev` (or Miniflare) with mock Hyperdrive settings; document how frontend hits local Worker endpoint during dev.
- [x] Database setup
  - Configure Drizzle ORM with Postgres via Cloudflare Hyperdrive HTTP connection.
  - Set up `drizzle.config.ts`, migrations directory, and scripts for generate/push/reset (run via Node/CI prior to Worker deploy).
  - Add Turborepo pipeline step `db:migrate` executing `drizzle-kit push` against target environment; integrate into CI before Worker deployment.
  - Choose Drizzle HTTP driver compatible with Hyperdrive/PlanetScale Postgres (e.g., `drizzle-orm/postgres-js` with `Hyperdrive` binding) and document instantiation.
- [x] CI/CD baseline
  - Configure GitHub Actions (lint, build, backend tests) with caching.
  - Set up Dependabot for npm/pnpm updates.

## 2. Backend Foundation
- [x] Database schema and migrations
  - Define tables: `models` (LLM metadata), `matches`, `games`, `moves`, `leaderboard_stats`.
  - Create initial migration and seed script for Gemini Nano model entries.
- [x] Authentication system
  - Stub token validation middleware for future use; current release allows public access.
- [ ] Core services and utilities
  - Implement data access layer via Drizzle repositories with typed query helpers.
  - Add time utilities and validation helpers for move timestamps.
  - Create logging helper that wraps console output and forwards structured events to Sentry (sole logging sink).
  - Introduce Zod schema library; define shared request/response validators and type-safe parsing helpers.
- [ ] Schema package
  - Create shared `packages/schema` workspace exposing Zod contracts for API requests/responses.
  - Ensure frontend consumes published types while backend remains authoritative over persistence models.
- [ ] Base API structure
  - Configure Hono app with routing, JSON middleware, error handling, and structured console logging helper.
  - Add CORS config to accept frontend origin and handle preflights within Workers environment.
  - Integrate Sentry Cloudflare + Hono middleware for error/performance monitoring and log forwarding.
  - Implement health check endpoint.
  - Inject Hyperdrive database binding through `env` and pass into Drizzle client per request.

## 3. Feature-specific Backend
- [ ] Match configuration endpoints
  - POST `/sessions` to create session with LLM pair, difficulty, round count; validate 1–100 limit.
  - GET `/sessions/:id` for session status including current game index.
- [ ] Game execution and logging endpoints
  - POST `/sessions/:id/games` to record completed game result, winner, board state.
  - POST `/games/:id/moves` to append move detail (timestamp, reasoning, position).
- [ ] Leaderboard aggregation
  - GET `/leaderboard` returning global win/loss/tie stats per model.
  - Background job or transaction should upsert leaderboard totals after each game completion.
- [ ] Data validation and processing
  - Ensure moves conform to tic tac toe rules using domain guards and Zod validation; reject invalid positions or duplicate moves.
  - Normalize reasoning text length (truncate/store preview plus full text if needed).
- [ ] Storage strategy
  - Implement archival retention (e.g., 30-day limitation) configuration placeholder.
- [ ] External integration prep
  - Provide interfaces for future analytics hooks (event emitter for match start/end).
- [ ] Error handling
  - Return descriptive errors for invalid sessions, exceeding round limits, or persistence failures.
- [ ] Testing utilities
  - Seed script to generate sample sessions for development.
  - Mock data generators for moves and outcomes.

## 4. Frontend Foundation
- [ ] UI framework setup
  - Configure Vite + React + TypeScript with strict settings and absolute imports.
- [ ] Component library integration
  - Install Magic UI components, configure theming tokens (colors, spacing) in Tailwind.
- [ ] Routing system
  - Set up TanStack Router with routes for `arena` and `leaderboard`.
- [ ] State management
  - Introduce TanStack Query for data fetching and mutations; define query clients and providers.
  - Add context/store for UI preferences (reduced motion).
- [ ] API client scaffolding
  - Create typed API client with Axios or fetch wrapper, handling base URL and error normalization.
  - Surface Sentry browser client configuration (e.g., `VITE_SENTRY_DSN`, sample rate env flags) and initialize within app entry.
- [ ] Accessibility utilities
  - Implement focus management hooks, live region helpers.
- [ ] Authentication UI placeholder
  - Provide hidden/disabled auth components for future role support; currently show no login.
- [ ] Observability instrumentation
  - Install Sentry React SDK with Vite integration; configure DSN from environment and tie into reduced-motion analytics.
- [ ] Gemini Nano integration
  - Install and configure `@built-in-ai/core` (or equivalent Gemini Nano SDK) for in-browser inference.
  - Implement runtime capability checks and fallback messaging if Gemini Nano unavailable.

## 5. Feature-specific Frontend
- [ ] Match configuration UI
  - Build `MatchControls` component using `bento-grid` for LLM selectors, difficulty presets, round count stepper.
  - Implement validation messaging for out-of-range input and confirm summary state.
- [ ] Match arena board
  - Develop `TicTacToeBoard` using `magic-card`, track active cell states, keyboard navigation.
  - Integrate visual feedback for active player, winning lines (particles/meteors, with reduced motion fallback).
- [ ] Telemetry panel
  - Create `MatchTelemetry` component with `neon-gradient-card`, `number-ticker` countdown, streak badges.
  - Connect to live session state (game index, timer).
- [ ] Move log
  - Implement `MoveLog` using `animated-list`, auto-scroll, pause/resume control, reasoning text toggle.
- [ ] Leaderboard view
  - Build responsive `LeaderboardGrid` and `LeaderboardCard` components showing stats, rank, highlights.
  - Add trend highlight marquee with placeholder data until backend integration.
- [ ] Header and navigation
  - Compose header with `warp-background`, logo (`aurora-text`), view switcher, CTA button, reduced-motion toggle.
  - Reflect match progress (e.g., badge “Game 4/10”).
- [ ] Mobile adaptations
  - Implement `dock` bottom sheet for match controls on mobile, ensure gestures and accessibility.
  - Create carousel version of leaderboard for small screens.
- [ ] Error and empty states
  - Add inline alert components for configuration or API errors.
  - Provide empty state messaging when no leaderboard data exists.
- [ ] Persistence feedback
  - Show toast after session completion with rematch button; ensure toasts respect reduced motion.

## 6. Integration
- [ ] Frontend-backend session flow
  - Wire match configuration to POST `/sessions`, handle session ID storage.
  - On each game completion, send results/moves to backend and fetch updated leaderboard.
- [ ] Real-time/near-real-time updates
  - Decide on polling interval or event-based updates for session status.
  - Update telemetry and header indicators with backend responses.
- [ ] Data hydration
  - Prefetch leaderboard data on app load; fallback to cached state on failure.
- [ ] Consistency handling
  - Implement cautious optimistic UI patterns; reconcile with backend truth after responses.
- [ ] Reduced-motion state propagation
  - Ensure backend statuses trigger appropriate animation variants.

## 7. Testing
- [ ] Backend unit tests
  - Cover services (session creation, result calculation), repositories, validation logic.
- [ ] Backend integration tests
  - Test API endpoints via supertest (session lifecycle, leaderboard updates).
- [ ] Frontend unit tests
  - Component tests with Vitest/React Testing Library (controls, board, telemetry).
- [ ] Frontend integration tests
  - Simulate match flow using Vitest + React Testing Library or Cypress component tests.
- [ ] End-to-end tests
  - Configure Playwright/Cypress to run through configuration, simulated match (mock LLM moves), leaderboard check.
- [ ] Performance testing
  - Benchmark backend endpoints with sample payloads; verify 100-round sessions remain performant.
  - Lighthouse/Chrome profiling for frontend responsiveness.
- [ ] Security testing
  - Validate API against injection, rate limiting; ensure CORS and headers configured.
- [ ] Accessibility testing
  - Run axe-core/Storybook checks, manual keyboard navigation, screen reader spot checks.

## 8. Documentation
- [ ] API documentation
  - Create OpenAPI/Swagger spec for backend endpoints; publish via `/docs`.
- [ ] Developer guides
  - Update `README` with setup, commands, environment variables.
  - Document backend architecture, storage strategy, data models.
- [ ] Frontend implementation notes
  - Record component usage, Magic UI customizations, token definitions.
- [ ] System architecture
  - Diagram data flow between frontend, backend, storage.
- [ ] Runbooks
  - Document how to reset sessions, clear storage, seed data.

## 9. Deployment
- [ ] CI/CD pipeline
  - Extend GitHub Actions to run backend migrations, build artifacts, run tests on pull requests.
- [ ] Staging environment
  - Provision Cloudflare Worker staging environment via Wrangler (`env.staging`) with Hyperdrive binding and secrets; configure frontend preview deployment.
- [ ] Production environment
  - Configure production Cloudflare Worker deployment (`wrangler publish --env production`) with bound secrets and domain routing; align frontend hosting with production domain.
- [ ] Monitoring setup
  - Ensure Sentry projects (Workers + React) configured with alert rules and dashboards.
  - Add uptime monitoring (Cloudflare health checks or external ping service) for Worker endpoints.

## 10. Maintenance
- [ ] Bug triage process
  - Define GitHub issue templates, severity labels, SLA expectations.
- [ ] Update cadence
  - Schedule dependency updates (monthly) and Gemini Nano version reviews.
- [ ] Backup strategy
  - Configure Postgres-compatible backups using PlanetScale tooling (branch backups, scheduled dumps); document restore procedure.
- [ ] Performance monitoring
  - Track response times, session counts via dashboards.
- [ ] Future enhancements log
  - Maintain backlog for planned features (filters, exports, auth) linked to PRD future enhancements.
