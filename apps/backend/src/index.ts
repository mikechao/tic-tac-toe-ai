import { Hono } from 'hono'

import { validateEnv, type Env } from './env'
import { registerRoutes } from './routes'

const app = new Hono<{ Bindings: Env }>()

app.use('*', async (c, next) => {
  validateEnv(c.env)
  return next()
})

registerRoutes(app)

export default app
