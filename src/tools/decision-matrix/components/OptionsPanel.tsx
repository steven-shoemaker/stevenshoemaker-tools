import type { DecisionMatrixApi } from '../model/useDecisionMatrix'

type Props = {
  api: DecisionMatrixApi
}

export function OptionsPanel({ api }: Props) {
  const { state, addOption, renameOption, removeOption } = api

  return (
    <section className="dm-panel dm-card" aria-labelledby="dm-options-title">
      <div className="dm-panel-head">
        <h2 id="dm-options-title" className="dm-section-title">
          Options
        </h2>
        <button
          type="button"
          className="dm-btn dm-btn-secondary dm-btn-sm"
          onClick={addOption}
        >
          Add
        </button>
      </div>
      <p className="dm-section-sub">Choices you are comparing.</p>

      {state.options.length === 0 ? (
        <p className="dm-muted dm-panel-empty">No options yet.</p>
      ) : (
        <ul className="dm-entity-list">
          {state.options.map((o, i) => (
            <li key={o.id} className="dm-entity-row">
              <span className="dm-entity-index">{i + 1}</span>
              <input
                className="dm-entity-input"
                value={o.name}
                onChange={(e) => renameOption(o.id, e.target.value)}
                aria-label={`Option ${i + 1} name`}
              />
              <button
                type="button"
                className="dm-btn dm-btn-ghost dm-btn-icon"
                onClick={() => removeOption(o.id)}
                aria-label={`Remove ${o.name}`}
                title={`Remove ${o.name}`}
              >
                <span aria-hidden>×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
