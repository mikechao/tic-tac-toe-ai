import { Hono } from 'hono'

import type { Env } from '../../env'

export function registerApiRoutes(app: Hono<{ Bindings: Env }>): void {
  app.get('/version', (c) => c.json({ version: 'v0' }))
}
