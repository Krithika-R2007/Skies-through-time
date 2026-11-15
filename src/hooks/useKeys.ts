import { useEffect, useRef } from 'react'

type KeyHandlers = Record<string, (e: KeyboardEvent) => void>

// Page-level keyboard shortcuts. Ignores typing in form fields, and ignores Space while a
// button is focused so it never double-triggers with the native click.
export function useKeys(handlers: KeyHandlers): void {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName) || t.isContentEditable)) return
      if (e.key === ' ' && t?.tagName === 'BUTTON') return
      ref.current[e.key]?.(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
