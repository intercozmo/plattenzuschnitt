// src/hooks/useResizeObserver.ts
import { useState, useEffect, type RefObject } from 'react'

interface Size {
  width: number
  height: number
}

/**
 * Observes the size of the element referenced by `ref` and returns its
 * current { width, height } in pixels.  Updates whenever the element resizes.
 */
export function useResizeObserver(ref: RefObject<HTMLElement>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })

    observer.observe(el)
    // Capture initial size immediately
    const { width, height } = el.getBoundingClientRect()
    setSize({ width, height })

    return () => observer.disconnect()
  }, [ref])

  return size
}
