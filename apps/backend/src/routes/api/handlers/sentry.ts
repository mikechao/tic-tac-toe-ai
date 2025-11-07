import type { Context } from 'hono'

import type { Env, WorkerEnv } from '../../../env'
import type { AuthVariables } from '../../../services/auth'
import type { LoggerVariables } from '../../../services/logger'

type AppVariables = AuthVariables & LoggerVariables & { runtimeEnv: Env }

function extractProjectId(pathname: string): string | null {
  const trimmed = pathname.replace(/^\/+/, '')
  return trimmed.length > 0 ? trimmed : null
}

export async function postSentry(
  c: Context<{ Bindings: WorkerEnv; Variables: AppVariables }>,
) {
  const { logger, runtimeEnv } = c.var
  console.log('Received Sentry envelope POST request')
  if (!runtimeEnv.SENTRY_DSN) {
    logger?.error('Sentry DSN missing for tunnel endpoint')
    return c.json(
      { message: 'Sentry DSN is not configured on the backend' },
      500 as never,
    )
  }

  let envelopeBytes: ArrayBuffer
  try {
    envelopeBytes = await c.req.arrayBuffer()
  } catch (error) {
    logger?.error('Failed to read Sentry envelope bytes', { error })
    return c.json(
      { message: 'Invalid Sentry envelope payload' },
      400 as never,
    )
  }

  const decoder = new TextDecoder()
  const envelopeString = decoder.decode(envelopeBytes)
  const newlineIndex = envelopeString.indexOf('\n')
  const headerLine =
    newlineIndex === -1
      ? envelopeString.trim()
      : envelopeString.slice(0, newlineIndex).trim()

  let header: { dsn?: string }
  try {
    header = JSON.parse(headerLine)
  } catch (error) {
    logger?.warn('Failed to parse Sentry envelope header', { error })
    return c.json(
      { message: 'Invalid Sentry envelope header' },
      400 as never,
    )
  }

  if (typeof header.dsn !== 'string') {
    logger?.warn('Sentry envelope missing DSN header')
    return c.json(
      { message: 'Sentry envelope missing DSN header' },
      400 as never,
    )
  }

  let backendDsn: URL
  let envelopeDsn: URL
  try {
    backendDsn = new URL(runtimeEnv.SENTRY_DSN)
    envelopeDsn = new URL(header.dsn)
  } catch (error) {
    logger?.warn('Invalid Sentry DSN value', { error })
    return c.json(
      { message: 'Invalid Sentry DSN value' },
      400 as never,
    )
  }

  const expectedHost = backendDsn.hostname
  if (envelopeDsn.hostname !== expectedHost) {
    logger?.warn('Sentry envelope host mismatch', {
      expectedHost,
      receivedHost: envelopeDsn.hostname,
    })
    return c.json(
      { message: 'Invalid Sentry DSN hostname' },
      400 as never,
    )
  }

  const projectId = extractProjectId(envelopeDsn.pathname)
  if (!projectId) {
    logger?.warn('Sentry envelope missing project id')
    return c.json(
      { message: 'Invalid Sentry project id' },
      400 as never,
    )
  }

  const upstreamUrl = `${envelopeDsn.protocol}//${expectedHost}/api/${projectId}/envelope/`

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      body: envelopeBytes,
      headers: {
        'Content-Type':
          c.req.header('content-type') ?? 'application/x-sentry-envelope',
      },
    })

    if (!upstreamResponse.ok) {
      logger?.error('Sentry upstream rejected envelope', {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
      })
      return c.json(
        { message: 'Failed to forward Sentry envelope' },
        502 as never,
      )
    }
  } catch (error) {
    logger?.error('Failed to forward Sentry envelope', { error })
    return c.json(
      { message: 'Failed to forward Sentry envelope' },
      502 as never,
    )
  }

  return new Response(null, { status: 204 })
}
