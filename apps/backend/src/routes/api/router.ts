import type { Hono } from 'hono'

import type { Env } from '../../env'
import type { AuthVariables } from '../../services/auth'

export function registerApiRoutes(app: Hono<{ Bindings: Env; Variables: AuthVariables }>): void {
  app.get('/version', (c) => c.json({ version: 'v0' }))
}
