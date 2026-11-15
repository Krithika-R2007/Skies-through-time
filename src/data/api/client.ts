// Thin fetch layer for the SPHEREx Timekeeper backend. Every call has a timeout and
// throws ApiError with the backend's `detail` message so the UI can explain failures.

export const API_BASE: string = (import.meta.env?.VITE_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '')
export const FORCE_DEMO: boolean = import.meta.env?.VITE_FORCE_DEMO === '1'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type Params = Record<string, string | number | boolean | undefined | null>

export function buildUrl(path: string, params?: Params): string {
  const qs = new URLSearchParams()
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qs.set(k, String(v))
    }
  }
  const q = qs.toString()
  return `${API_BASE}${path}${q ? `?${q}` : ''}`
}

interface RequestOpts {
  signal?: AbortSignal
  timeoutMs?: number
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
}

export async function apiRequest<T>(path: string, params?: Params, opts: RequestOpts = {}): Promise<T> {
  if (FORCE_DEMO) throw new ApiError(0, 'Backend disabled (demo mode).')
  const ctrl = new AbortController()
  const timeout = window.setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20000)
  const onAbort = () => ctrl.abort()
  opts.signal?.addEventListener('abort', onAbort)
  try {
    const res = await fetch(buildUrl(path, params), {
      method: opts.method ?? 'GET',
      signal: ctrl.signal,
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
    if (!res.ok) {
      let detail = `Request failed (${res.status})`
      try {
        const j = await res.json()
        if (j?.detail) detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(res.status, detail)
    }
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  } catch (e) {
    if (e instanceof ApiError) throw e
    if ((e as Error).name === 'AbortError') {
      throw new ApiError(0, opts.signal?.aborted ? 'Request cancelled.' : 'The data service took too long to respond.')
    }
    throw new ApiError(0, 'Could not reach the data service.')
  } finally {
    window.clearTimeout(timeout)
    opts.signal?.removeEventListener('abort', onAbort)
  }
}

export const apiGet = <T,>(path: string, params?: Params, opts?: RequestOpts) => apiRequest<T>(path, params, opts)

/** Friendly message for the error contract in the integration guide. */
export function describeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 503) return `Data service temporarily unavailable. Try again in a few minutes. (${e.message})`
    if (e.status === 502) return 'Image unavailable. Try another epoch.'
    if (e.status === 404) return e.message
    return e.message
  }
  return 'Something went wrong.'
}
