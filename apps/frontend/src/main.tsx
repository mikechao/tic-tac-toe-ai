import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import * as Sentry from '@sentry/react'

import { getRouter } from './router'

const router = getRouter()

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const sentryDsn = import.meta.env.VITE_SENTRY_DSN
const backendUrl = import.meta.env.VITE_BACKEND_URL

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tunnel: `${backendUrl}/api/sentry`,
    environment: import.meta.env.VITE_SENTRY_ENV ?? 'development',
    tracesSampleRate: Number(
      import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1,
    ),
    replaysSessionSampleRate: Number(
      import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? 0.1,
    ),
    replaysOnErrorSampleRate: Number(
      import.meta.env.VITE_SENTRY_REPLAYS_ERROR_SAMPLE_RATE ?? 1.0,
    ),
    integrations: [
      // disable for now, causeing some issues
      // tanstackRouterBrowserTracingIntegration({
      //   router,
      // }),
      Sentry.replayIntegration(),
    ],
  })
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="max-w-md text-center text-sm text-white/70">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <button
            type="button"
            onClick={resetError}
            className="rounded-full border border-white/20 px-4 py-2 text-sm"
          >
            Try again
          </button>
        </div>
      )}
    >
      <RouterProvider router={router} />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
