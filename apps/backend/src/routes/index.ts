import { Hono } from 'hono'

import type { Env } from '../env'
import type { AuthVariables } from '../services/auth'
import type { LoggerVariables } from '../services/logger'
import { registerApiRoutes } from './api/router'

type AppVariables = AuthVariables & LoggerVariables

export function registerRoutes(app: Hono<{ Bindings: Env; Variables: AppVariables }>): void {
  app.get('/health', (c) => c.json({ status: 'ok' }))

  const api = new Hono<{ Bindings: Env; Variables: AppVariables }>().basePath('/api')
  registerApiRoutes(api)
  app.route('/api', api)
}
