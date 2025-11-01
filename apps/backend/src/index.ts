import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-workers'

import { validateEnv } from './env'
import { registerRoutes } from './routes'

const app = new Hono<{ Bindings: ReturnType<typeof validateEnv> }>()

registerRoutes(app)

export default handle(app)

