import { Hono } from 'hono'

import { validateEnv, type Env } from './env'
import { registerRoutes } from './routes'
import { createAuthMiddleware, type AuthVariables } from './services/auth'

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

app.use('*', async (c, next) => {
  validateEnv(c.env)
  return next()
})

const authMiddleware = createAuthMiddleware()
app.use('*', authMiddleware)

registerRoutes(app)

export default app
