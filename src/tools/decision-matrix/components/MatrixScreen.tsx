import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import type { DecisionMatrixApi } from '../model/useDecisionMatrix'
import { MatrixHeader } from './MatrixHeader'
import { ScoreGrid } from './ScoreGrid'

type Props = {
  api: DecisionMatrixApi
}

function formatScore(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2)
}

export function MatrixScreen({ api }: Props) {
  const { state, compute, toast, dismissToast, sharedFromUrl } = api
  const empty =
    state.options.length === 0 && state.criteria.length === 0
  const leader = compute.results[0]
  const [rankAnnounce, setRankAnnounce] = useState('')
  const announceTimer = useRef(0)

  useEffect(() => {
    if (!toast) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismissToast()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toast, dismissToast])

  useEffect(() => {
    window.clearTimeout(announceTimer.current)
    if (!compute.hasWeights || !leader) {
      setRankAnnounce('')
      return
    }
    const { optionName, total, percent } = leader
    announceTimer.current = window.setTimeout(() => {
      setRankAnnounce(
        `${optionName} leads with ${formatScore(total)} points (${percent}%)`,
      )
    }, 600)
    return () => window.clearTimeout(announceTimer.current)
  }, [leader, compute.hasWeights])

  return (
    // reducedMotion="user" drops transform and layout animations for anyone
    // who asked for that at the OS level; AnimatedScore handles its own.
    <MotionConfig reducedMotion="user">
    <div className="dm-screen">
      <MatrixHeader api={api} />

      {sharedFromUrl && (
        <div className="dm-banner" role="status">
          Shared link loaded. Changes save on this device.
        </div>
      )}

      <div
        className="dm-sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {rankAnnounce}
      </div>

      {/* Stable region: a live region mounted at the same moment as its text
          announces unreliably, so the toast announces from here instead. */}
      <div
        className="dm-sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toast ?? ''}
      </div>

      <main className="dm-main">
        {empty ? (
          <section className="dm-empty dm-card">
            <h2 className="dm-empty-title">Start your matrix</h2>
            <p className="dm-empty-copy">
              Add options and weighted criteria, then score each cell. Rankings
              update as you edit.
            </p>
            <div className="dm-empty-actions">
              <button
                type="button"
                className="dm-btn dm-btn-primary"
                onClick={() => {
                  api.addOption()
                  api.addCriterion()
                }}
              >
                Add option and criterion
              </button>
              <button
                type="button"
                className="dm-btn dm-btn-secondary"
                onClick={api.resetToDemo}
              >
                Load sample
              </button>
            </div>
          </section>
        ) : (
          <>
            <ScoreGrid api={api} />

            {!compute.hasWeights && state.criteria.length > 0 && (
              <div className="dm-warn dm-card" role="alert">
                All weights are zero. Move a weight slider to rank options.
              </div>
            )}
          </>
        )}
      </main>

      <footer className="dm-footer">
        <Link className="dm-back" to="/">
          ← All tools
        </Link>
        <span className="dm-footer-meta">
          Scores {state.scaleMin}–{state.scaleMax} · nothing leaves your browser
        </span>
      </footer>

      {toast && (
        <button
          type="button"
          className="dm-toast"
          onClick={dismissToast}
          aria-label={`${toast}. Dismiss`}
        >
          <span aria-hidden>{toast}</span>
          <span className="dm-toast-hint" aria-hidden>
            Esc
          </span>
        </button>
      )}
    </div>
    </MotionConfig>
  )
}
