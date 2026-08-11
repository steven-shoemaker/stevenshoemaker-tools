import { Link } from 'react-router-dom'
import type { DecisionMatrixApi } from '../model/useDecisionMatrix'
import { CriteriaPanel } from './CriteriaPanel'
import { MatrixHeader } from './MatrixHeader'
import { OptionsPanel } from './OptionsPanel'
import { RankingsPanel } from './RankingsPanel'
import { ScoreGrid } from './ScoreGrid'

type Props = {
  api: DecisionMatrixApi
}

export function MatrixScreen({ api }: Props) {
  const { state, compute } = api
  const empty =
    state.options.length === 0 && state.criteria.length === 0

  return (
    <div className="dm-screen">
      <MatrixHeader api={api} />

      {api.sharedFromUrl && (
        <div className="dm-banner" role="status">
          Opened from a shared link. Edits save locally on this device.
        </div>
      )}

      <main className="dm-main">
        <RankingsPanel api={api} />

        {empty ? (
          <section className="dm-empty dm-card">
            <h2 className="dm-empty-title">Start your matrix</h2>
            <p className="dm-empty-copy">
              Add options you are choosing between and criteria that matter.
              Weight each criterion, score every cell, and rankings update live.
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
                Add first option and criterion
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
            <div className="dm-panels">
              <OptionsPanel api={api} />
              <CriteriaPanel api={api} />
            </div>

            {state.options.length === 0 && (
              <div className="dm-hint dm-card">
                <p>Add at least one option to score and rank.</p>
                <button
                  type="button"
                  className="dm-btn dm-btn-secondary"
                  onClick={api.addOption}
                >
                  Add option
                </button>
              </div>
            )}

            {state.criteria.length === 0 && (
              <div className="dm-hint dm-card">
                <p>Add criteria with weights to calculate rankings.</p>
                <button
                  type="button"
                  className="dm-btn dm-btn-secondary"
                  onClick={api.addCriterion}
                >
                  Add criterion
                </button>
              </div>
            )}

            {!compute.hasWeights && state.criteria.length > 0 && (
              <div className="dm-warn dm-card" role="alert">
                All criteria weights are zero. Adjust weights to rank options.
              </div>
            )}

            {state.options.length > 0 && state.criteria.length > 0 && (
              <ScoreGrid api={api} />
            )}
          </>
        )}
      </main>

      <footer className="dm-footer">
        <Link className="dm-back" to="/">
          ← All tools
        </Link>
        <span>Scores {state.scaleMin}–{state.scaleMax} · nothing leaves your browser</span>
      </footer>

      {api.toast && (
        <div className="dm-toast" role="status" onClick={api.dismissToast}>
          {api.toast}
        </div>
      )}
    </div>
  )
}
