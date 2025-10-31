# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds all TypeScript sources: `components/` for reusable UI, `routes/` for TanStack route files (including generated `routeTree.gen.ts`), `integrations/` for providers such as React Query, `lib/` for utilities, and `data/` for seeded game content. Keep new modules colocated with their route or feature when possible.
- `public/` serves static assets and icons, `docs/` contains architectural notes like `component-architecture.md`, and `dist/` is produced by the Vite build. Avoid editing generated artifacts under `dist/`; regenerate them via the build instead.

## Build, Test, and Development Commands
- `pnpm dev` launches the Vite dev server on http://localhost:3000 with hot reload.
- `pnpm build` compiles an optimized production bundle into `dist/`.
- `pnpm serve` previews the latest production build locally.
- `pnpm test` runs the Vitest suite once in a jsdom environment; use `pnpm test -- --watch` while iterating.
- `pnpm lint`, `pnpm format`, and `pnpm check` invoke Biome for linting, formatting, and combined checks; run them before opening a pull request.

## Coding Style & Naming Conventions
- Follow Biome defaults: 2-space indentation, semicolons omitted, single quotes for strings where possible; run `pnpm format` before committing.
- Use TypeScript with explicit return types on exported functions and components when not inferred.
- React components and hooks should use `PascalCase` and `useCamelCase` respectively; colocated route files remain `kebab-case` to align with TanStack routing.
- Prefer Tailwind utility classes defined in `styles.css` and shared component variants under `src/components/`.
- For UI components use magicui

## Testing Guidelines
- Write Vitest specs alongside the source they cover using the `*.test.ts` or `*.test.tsx` pattern, e.g. `src/components/Board.test.tsx`.
- Use `@testing-library/react` for UI assertions and favor user-facing queries (`getByRole`, `findByText`).
- Include regression tests for AI move selection logic and edge cases such as full boards or invalid moves.
- Generate coverage locally with `pnpm test -- --coverage` when introducing core gameplay changes.

## Commit & Pull Request Guidelines
- Keep commits focused and use short, capitalized imperatives similar to the existing history (e.g. `Add minimax evaluator`, `Refine board theming`); avoid trailing punctuation.
- Reference related issues in the message body when applicable and note follow-up tasks as `Refs:` lines.
- Pull requests should describe intent, list validation commands run (at minimum `pnpm test` and `pnpm lint`), and attach screenshots or GIFs when UI or animations change.
- Call out API or data contract updates explicitly and tag reviewers responsible for affected areas.

## Environment & Configuration
- Store local secrets in `.env` files and prefix client-exposed variables with `VITE_`; never commit real API keys.
- After adjusting configuration files like `vite.config.ts` or `tsconfig.json`, rerun `pnpm dev` to verify the app still boots cleanly.

## Tools and MCP Servers 
- use magicui MCP Server to help you work with magicui components.
- use the context7 MCP Server to help you look up documentation for various frameworks and or libraries. 
