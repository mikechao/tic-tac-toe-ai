import type { Env } from '../env'

import { Hono } from 'hono'

export function registerRoutes(app: Hono<{ Bindings: Env }>): void {
  app.get('/health', (c) => {
    return c.json({ status: 'ok' })
  })
}

