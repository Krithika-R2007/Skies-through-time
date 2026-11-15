import { useCallback, useEffect, useRef, useState } from 'react'
import { describeError } from '../data/api/client'

export interface AsyncState<T> {
  data: T | null
  error: string
  loading: boolean
}

/** Runs `fn` when `key` changes (when `enabled`). Stale and aborted results are dropped. */
export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  key: string,
  enabled = true,
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: '', loading: enabled })
  const [tick, setTick] = useState(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, error: '', loading: false })
      return
    }
    const ctrl = new AbortController()
    setState((s) => ({ data: s.data, error: '', loading: true }))
    fnRef
      .current(ctrl.signal)
      .then((data) => !ctrl.signal.aborted && setState({ data, error: '', loading: false }))
      .catch((e) => !ctrl.signal.aborted && setState({ data: null, error: describeError(e), loading: false }))
    return () => ctrl.abort()
  }, [key, enabled, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}
