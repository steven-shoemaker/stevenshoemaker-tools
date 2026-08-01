import { useEffect, useRef, useState } from 'react'

type Props = {
  value: number
  /** Decimal places to show (0 for integers) */
  decimals?: number
  className?: string
  durationMs?: number
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

function format(value: number, decimals: number): string {
  if (decimals <= 0) return String(Math.round(value))
  return (Math.round(value * 10 ** decimals) / 10 ** decimals).toFixed(decimals)
}

/**
 * Smoothly interpolates when `value` changes. Snaps immediately under reduced motion.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  className,
  durationMs = 280,
}: Props) {
  const [display, setDisplay] = useState(value)
  const displayRef = useRef(value)
  const frameRef = useRef(0)

  useEffect(() => {
    const from = displayRef.current
    if (from === value) return

    if (prefersReducedMotion()) {
      displayRef.current = value
      setDisplay(value)
      return
    }

    const start = performance.now()
    cancelAnimationFrame(frameRef.current)

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const next = from + (value - from) * easeOutCubic(t)
      displayRef.current = next
      setDisplay(next)
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        displayRef.current = value
        setDisplay(value)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, durationMs])

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {format(display, decimals)}
    </span>
  )
}
