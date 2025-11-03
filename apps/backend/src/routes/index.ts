import { Hono } from 'hono'
import * as Sentry from '@sentry/cloudflare'

import type { Env, WorkerEnv } from '../env'
import type { AuthVariables } from '../services/auth'
import type { LoggerVariables } from '../services/logger'
import { registerApiRoutes } from './api/router'

type AppVariables = AuthVariables & LoggerVariables & { runtimeEnv: Env }

export function registerRoutes(app: Hono<{ Bindings: WorkerEnv; Variables: AppVariables }>): void {
  app.get('/health', (c) => c.json({ status: 'ok' }))

  // Sentry test route - remove this after verifying Sentry works
  app.get('/debug-sentry', async () => {
    await Sentry.startSpan(
      {
        op: 'test',
        name: 'My First Test Transaction',
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 100)) // Wait for 100ms
        throw new Error('My first Sentry error!')
      }
    )
  })

  const api = new Hono<{ Bindings: WorkerEnv; Variables: AppVariables }>().basePath('/api')
  registerApiRoutes(api)
  app.route('/api', api)
}
