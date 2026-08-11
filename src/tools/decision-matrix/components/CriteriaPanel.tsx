import type { DecisionMatrixApi } from '../model/useDecisionMatrix'

type Props = {
  api: DecisionMatrixApi
}

export function CriteriaPanel({ api }: Props) {
  const { state, compute, addCriterion, renameCriterion, setCriterionWeight, removeCriterion } =
    api

  const totalWeight = compute.totalWeight

  return (
    <section className="dm-panel dm-card" aria-labelledby="dm-criteria-title">
      <div className="dm-panel-head">
        <h2 id="dm-criteria-title" className="dm-section-title">
          Criteria
        </h2>
        <button
          type="button"
          className="dm-btn dm-btn-secondary dm-btn-sm"
          onClick={addCriterion}
        >
          Add
        </button>
      </div>
      <p className="dm-section-sub">
        Weight each factor. Shares normalize to {totalWeight || 0} total points.
      </p>

      {state.criteria.length === 0 ? (
        <p className="dm-muted dm-panel-empty">No criteria yet.</p>
      ) : (
        <ul className="dm-criteria-list">
          {state.criteria.map((c) => {
            const share =
              totalWeight > 0
                ? Math.round((c.weight / totalWeight) * 100)
                : 0
            return (
              <li key={c.id} className="dm-criterion-row">
                <div className="dm-criterion-top">
                  <input
                    className="dm-entity-input"
                    value={c.name}
                    onChange={(e) => renameCriterion(c.id, e.target.value)}
                    aria-label={`Criterion ${c.name}`}
                  />
                  <button
                    type="button"
                    className="dm-btn dm-btn-ghost dm-btn-icon"
                    onClick={() => removeCriterion(c.id)}
                    aria-label={`Remove ${c.name}`}
                  >
                    ×
                  </button>
                </div>
                <div className="dm-weight-row">
                  <input
                    type="range"
                    className="dm-weight-slider"
                    min={0}
                    max={100}
                    step={1}
                    value={c.weight}
                    onChange={(e) =>
                      setCriterionWeight(c.id, Number(e.target.value))
                    }
                    aria-label={`Weight for ${c.name}`}
                  />
                  <div className="dm-weight-meta">
                    <input
                      type="number"
                      className="dm-weight-num"
                      min={0}
                      max={100}
                      value={c.weight}
                      onChange={(e) =>
                        setCriterionWeight(c.id, Number(e.target.value))
                      }
                      aria-label={`Weight value for ${c.name}`}
                    />
                    <span className="dm-weight-share">{share}%</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
