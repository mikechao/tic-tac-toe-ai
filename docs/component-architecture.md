# Component and Routing Overview

This document summarizes the active UI components, providers, and routes in
this TanStack Start project as of October 31, 2025. It highlights how pieces
fit together today and where new pages or components can plug in.

## Application Shell and Global Providers

- `src/router.tsx`
  - `getRouter()` builds the app router from the generated `routeTree` and
    injects the TanStack Query/TRPC context returned by
    `integrations/tanstack-query/root-provider.tsx`.
  - The `Wrap` component wraps every route in the shared `TanstackQuery.Provider`
    so React Query and TRPC hooks are available anywhere inside the tree.
  - `setupRouterSsrQueryIntegration` keeps the router and query client in sync
    for server-side rendering and hydration.
- `src/routes/__root.tsx`
  - Defines the root layout the router renders for every page. It sets up
    `<html>` scaffolding, links shared styles from `src/styles.css`, renders the
    persistent `<Header />`, and mounts TanStack Devtools plus `<Scripts />`.
  - The root route takes a context with the `queryClient` and `trpc` helpers
    supplied by the router factory, enabling loaders and components to access
    data utilities without recreating providers.

## UI Components

- `src/components/Header.tsx`
  - Responsive navigation drawer built with Tailwind classes. Links map to the
    demo routes under `/demo/...`. Group toggles control nested SSR examples.
  - Extension: add new top-level links or nested groups when creating new
    route files; keep accessibility attributes (`aria-label`, focus handling)
    aligned with existing buttons.
- `src/components/ui/globe.tsx`
  - Animated COBE globe that powers the landing page. It accepts optional class
    names and configuration, making it reusable on future pages.
  - Extension: expose custom marker sets via the `config` prop to visualize new
    data without duplicating the animation logic.
- `src/lib/utils.ts`
  - Exposes `cn()` className helper (clsx + tailwind-merge) for consistent class
    merging across new components.
- Devtools helpers in `src/integrations/tanstack-query/` supply the
  `TanstackQuery.Provider` wrapper and renderable panel definition consumed by
  the root layout.

## Routing Structure

Routes live in `src/routes` and are automatically registered via TanStack
Start's file-based routing. Notable entries:

| Path | File | Purpose | Extension Notes |
| --- | --- | --- | --- |
| `/` | `src/routes/index.tsx` | Renders the animated `<Globe />`. | Replace `Globe` with a composed page component or wrap it in layout content for richer landing pages. |
| `/demo/start/server-funcs` | `src/routes/demo/start.server-funcs.tsx` | Demonstrates server functions with on-disk todo storage and invalidation. | New server functions can live alongside this file or in `src/data/` for reuse. |
| `/demo/start/api-request` | `src/routes/demo/start.api-request.tsx` | Fetches names from a local API endpoint via React Query. | Add additional requests by composing new hooks or extending `/demo/api/*` handlers. |
| `/demo/start/ssr` | `src/routes/demo/start.ssr.index.tsx` | Entry point that links to SSR strategy demos. | Add new SSR variations by creating files like `start.ssr.<variant>.tsx` and linking them here. |
| `/demo/start/ssr/spa-mode` | `src/routes/demo/start.ssr.spa-mode.tsx` | Client-only data fetching example using `getPunkSongs`. | Follow this pattern for routes that should skip SSR (`ssr: false`). |
| `/demo/start/ssr/full-ssr` | `src/routes/demo/start.ssr.full-ssr.tsx` | Loader-driven SSR with dehydrated data. | Share loaders between routes by exporting helpers from `src/data/`. |
| `/demo/start/ssr/data-only` | `src/routes/demo/start.ssr.data-only.tsx` | Hybrid SSR where only data is preloaded. | Experiment with incremental hydration by adjusting the `ssr` flag. |
| `/demo/trpc-todo` | `src/routes/demo/trpc-todo.tsx` | Uses TRPC hooks to read/write todos backed by `integrations/trpc/router.ts`. | Add new procedures in the TRPC router and access them through `useTRPC()`. |
| `/demo/tanstack-query` | `src/routes/demo/tanstack-query.tsx` | React Query todo example calling REST handlers. | Reuse `useQuery`/`useMutation` patterns when wiring external APIs. |
| `/demo/api/names` | `src/routes/demo/api.names.ts` | Returns a static list of names for `/demo/start/api-request`. | Author additional JSON endpoints under `/demo/api.*` for local mocks. |
| `/demo/api/tq-todos` | `src/routes/demo/api.tq-todos.ts` | REST handlers supporting the TanStack Query demo. | Extend with PUT/DELETE handlers or extract shared data sources. |
| `/api/trpc` | `src/routes/api.trpc.$.tsx` | Exposes the TRPC router over HTTP using fetch adapters. | Add routers and middleware in `integrations/trpc` before they surface here. |

Auto-generated files such as `src/routeTree.gen.ts` should not be edited
manually; re-run the TanStack Start build when new route files are added.

## Data Access Patterns

- Server Functions: `createServerFn` powers `getPunkSongs` and the server-funcs
  todo example, allowing direct filesystem or server-only logic. New functions
  live comfortably in `src/data/` or adjacent to their consuming routes.
- React Query: Globally provided `QueryClient` enables `useQuery` and
  `useMutation` inside any component. For loader prefetching, use the `context`
  injected into loaders (see `trpc-todo` route).
- TRPC: `integrations/trpc/router.ts` defines type-safe procedures, and
  `integrations/trpc/react.ts` exposes `useTRPC()` to retrieve strongly-typed
  query/mutation helpers.

## Extending the App

- New Pages: Create additional files under `src/routes` using
  `createFileRoute`. Configure SSR behaviour (`ssr` flag) and optional `loader`
  or `server.handlers` as shown in the demos. Link them from the header by
  updating `src/components/Header.tsx`.
- Shared Layouts: Augment the root layout (`__root.tsx`) or add parent routes
  with `layout.tsx` files if sections require different shells.
- Components: Place shared UI in `src/components` (optionally subfolders like
  `ui/`). Import them into routes or the header; reuse `cn()` for Tailwind class
  composition.
- Data Sources: For server-only logic, add modules next to existing helpers in
  `src/data` or expand the TRPC router. Remember to export types for client
  hooks.
- API Endpoints: Create additional `api.*.ts(x)` files in `src/routes` for REST
  handlers or enhance `api.trpc.$.tsx` by registering new routers.

By following the existing patterns—file-based routes, shared providers, and the
central navigation—you can introduce new components or pages with minimal
boilerplate while keeping data and UI concerns modular.
