import type { MiddlewareHandler } from 'hono'

export type AuthVariables = {
  authToken?: string
  userId?: string
}

export function createAuthMiddleware(): MiddlewareHandler<{
  Variables: AuthVariables
}> {
  return async (c, next) => {
    const authorization = c.req.header('authorization')

    if (authorization?.startsWith('Bearer ')) {
      const token = authorization.slice('Bearer '.length).trim()
      if (token.length > 0) {
        c.set('authToken', token)
      }
    }

    return next()
  }
}
