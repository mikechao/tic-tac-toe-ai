import { Hono } from 'hono'

import type { Env, WorkerEnv } from '../env'
import type { AuthVariables } from '../services/auth'
import type { LoggerVariables } from '../services/logger'
import { registerApiRoutes } from './api/router'

type AppVariables = AuthVariables & LoggerVariables & { runtimeEnv: Env }

export function registerRoutes(app: Hono<{ Bindings: WorkerEnv; Variables: AppVariables }>): void {
  app.get('/health', (c) => c.json({ status: 'ok' }))

  const api = new Hono<{ Bindings: WorkerEnv; Variables: AppVariables }>().basePath('/api')
  registerApiRoutes(api)
  app.route('/api', api)
}
