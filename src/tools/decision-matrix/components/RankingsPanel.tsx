import type { DecisionMatrixApi } from '../model/useDecisionMatrix'

type Props = {
  api: DecisionMatrixApi
}

export function RankingsPanel({ api }: Props) {
  const { compute, state } = api
  const leader = compute.results[0]
  const showPanel =
    state.options.length > 0 &&
    (state.criteria.length > 0 || compute.results.length > 0)

  if (!showPanel) return null

  return (
    <section className="dm-rankings dm-card" aria-labelledby="dm-rankings-title">
      <div className="dm-rankings-head">
        <div>
          <h2 id="dm-rankings-title" className="dm-section-title">
            Rankings
          </h2>
          <p className="dm-section-sub">
            {compute.hasWeights
              ? 'Weighted totals update as you edit scores and weights.'
              : 'Set criterion weights to enable ranking.'}
          </p>
        </div>
        {leader && compute.hasWeights && (
          <div className="dm-leader-pill">
            <span className="dm-leader-label">Leading</span>
            <strong>{leader.optionName}</strong>
          </div>
        )}
      </div>

      {compute.results.length === 0 ? (
        <p className="dm-muted">Add options to see rankings.</p>
      ) : (
        <ol className="dm-rank-list">
          {compute.results.map((r) => (
            <li key={r.optionId} className="dm-rank-item">
              <div className="dm-rank-row">
                <span className="dm-rank-num" aria-label={`Rank ${r.rank}`}>
                  {r.rank}
                </span>
                <div className="dm-rank-body">
                  <div className="dm-rank-top">
                    <span className="dm-rank-name">{r.optionName}</span>
                    <span className="dm-rank-score">
                      {compute.hasWeights ? (
                        <>
                          <strong>{formatScore(r.total)}</strong>
                          <span className="dm-rank-pct">{r.percent}%</span>
                        </>
                      ) : (
                        <span className="dm-muted">No weights</span>
                      )}
                    </span>
                  </div>

                  {compute.hasWeights && r.breakdown.length > 0 && (
                    <div
                      className="dm-breakdown"
                      role="img"
                      aria-label={`Score breakdown for ${r.optionName}`}
                    >
                      {r.breakdown.map((b) => (
                        <span
                          key={b.criterionId}
                          className="dm-breakdown-seg"
                          style={{
                            flexGrow: b.contribution,
                            flexBasis: 0,
                          }}
                          title={`${b.criterionName}: ${formatScore(b.contribution)} (${Math.round(b.weightShare * 100)}% weight × score ${b.score})`}
                        />
                      ))}
                    </div>
                  )}

                  {compute.hasWeights && (
                    <ul className="dm-breakdown-legend">
                      {r.breakdown.map((b) => (
                        <li key={b.criterionId}>
                          <span className="dm-legend-dot" aria-hidden />
                          <span>{b.criterionName}</span>
                          <span className="dm-legend-val">
                            {formatScore(b.contribution)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function formatScore(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2)
}
