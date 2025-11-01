import { Hono } from 'hono'

import type { Env } from '../env'

export function registerRoutes(app: Hono<{ Bindings: Env }>): void {
  app.get('/health', (c) => {
    return c.json({ status: 'ok' })
  })
}
