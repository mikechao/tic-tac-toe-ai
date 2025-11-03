import type { MatchStatusResource } from '@arena/schema'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:8787'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions<TBody> extends Omit<RequestInit, 'body'> {
  body?: TBody
  parseJson?: boolean
}

interface ApiErrorShape {
  message: string
  code?: string
  details?: unknown
  status?: number
}

export class ApiError extends Error {
  public readonly code?: string
  public readonly details?: unknown
  public readonly status?: number

  constructor({ message, code, details, status }: ApiErrorShape) {
    super(message)
    this.code = code
    this.details = details
    this.status = status
  }
}

async function request<TResponse, TBody = unknown>(
  method: HttpMethod,
  path: string,
  options: RequestOptions<TBody> = {}
): Promise<TResponse> {
  const { body, headers, parseJson = true, ...rest } = options
  const url = new URL(path, API_BASE_URL)

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  })

  if (!response.ok) {
    let payload: ApiErrorShape = {
      message: 'Request failed',
      status: response.status,
    }

    try {
      const json = await response.json()
      payload = {
        message: json.message ?? payload.message,
        code: json.code,
        details: json.details,
        status: response.status,
      }
    } catch {
      // ignore
    }

    throw new ApiError(payload)
  }

  if (!parseJson) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}

export const apiClient = {
  get: <TResponse>(path: string) => request<TResponse>('GET', path),
  post: <TResponse, TBody = unknown>(path: string, body: TBody) =>
    request<TResponse, TBody>('POST', path, { body }),
}

export type SessionResponse = { session: MatchStatusResource }
