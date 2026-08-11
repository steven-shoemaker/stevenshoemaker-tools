import { useCallback, useRef, type KeyboardEvent } from 'react'
import type { DecisionMatrixApi } from '../model/useDecisionMatrix'
import { scoreKey } from '../model/types'

type Props = {
  api: DecisionMatrixApi
}

export function ScoreGrid({ api }: Props) {
  const { state, compute, setScore } = api
  const gridRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
      const rows = state.options.length
      const cols = state.criteria.length
      let nr = row
      let nc = col
      switch (e.key) {
        case 'ArrowRight':
          nc = Math.min(col + 1, cols - 1)
          break
        case 'ArrowLeft':
          nc = Math.max(col - 1, 0)
          break
        case 'ArrowDown':
          nr = Math.min(row + 1, rows - 1)
          break
        case 'ArrowUp':
          nr = Math.max(row - 1, 0)
          break
        default:
          return
      }
      e.preventDefault()
      const sel = gridRef.current?.querySelector<HTMLInputElement>(
        `[data-cell="${nr}-${nc}"]`,
      )
      sel?.focus()
      sel?.select()
    },
    [state.options.length, state.criteria.length],
  )

  return (
    <section className="dm-grid-section dm-card" aria-labelledby="dm-grid-title">
      <div className="dm-grid-head">
        <div>
          <h2 id="dm-grid-title" className="dm-section-title">
            Score matrix
          </h2>
          <p className="dm-section-sub">
            Rate each option against every criterion ({state.scaleMin} = low,{' '}
            {state.scaleMax} = high). Arrow keys move between cells.
          </p>
        </div>
      </div>

      <div className="dm-grid-scroll" ref={gridRef}>
        <table className="dm-grid">
          <thead>
            <tr>
              <th scope="col" className="dm-grid-corner">
                Option
              </th>
              {state.criteria.map((c) => {
                const share =
                  compute.totalWeight > 0
                    ? Math.round((c.weight / compute.totalWeight) * 100)
                    : 0
                return (
                  <th key={c.id} scope="col" className="dm-grid-col-head">
                    <span className="dm-grid-crit-name">{c.name}</span>
                    <span className="dm-grid-crit-weight">{share}%</span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {state.options.map((o, row) => {
              const result = compute.results.find((r) => r.optionId === o.id)
              return (
                <tr key={o.id}>
                  <th scope="row" className="dm-grid-row-head">
                    <span className="dm-grid-opt-name">{o.name}</span>
                    {result && compute.hasWeights && (
                      <span className="dm-grid-opt-total">
                        {formatScore(result.total)}
                      </span>
                    )}
                  </th>
                  {state.criteria.map((c, col) => {
                    const key = scoreKey(o.id, c.id)
                    const value = state.scores[key] ?? state.scaleMin
                    return (
                      <td key={c.id} className="dm-grid-cell">
                        <input
                          type="number"
                          className="dm-score-input"
                          data-cell={`${row}-${col}`}
                          min={state.scaleMin}
                          max={state.scaleMax}
                          step={1}
                          value={value}
                          onChange={(e) =>
                            setScore(o.id, c.id, Number(e.target.value))
                          }
                          onKeyDown={(e) => handleKeyDown(e, row, col)}
                          aria-label={`${o.name}, ${c.name}`}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function formatScore(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2)
}
