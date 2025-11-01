import { Hono } from 'hono'

import type { Env } from '../env'
import { registerApiRoutes } from './api/router'

export function registerRoutes(app: Hono<{ Bindings: Env }>): void {
  app.get('/health', (c) => c.json({ status: 'ok' }))

  const api = new Hono<{ Bindings: Env }>().basePath('/api')
  registerApiRoutes(api)
  app.route('/api', api)
}
