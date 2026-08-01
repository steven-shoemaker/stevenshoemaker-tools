import type { OrgChartApi } from '../model/useOrgChart'
import { DEMO_CSV } from '../model/demo'

type Props = {
  api: OrgChartApi
}

export function ImportScreen({ api }: Props) {
  const {
    csvText,
    setCsvText,
    buildFromCsv,
    repairs,
    previewStats,
    working,
    openSandbox,
    error,
  } = api

  return (
    <div className="oc-import">
      <header className="oc-topbar">
        <div className="oc-brand">
          <div className="oc-brand-mark" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 5.5H11M7 2.5V5.5M4.5 8.5H9.5M5.5 11.5H8.5"
                stroke="white"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <span className="oc-brand-title">Org Chart from CSV</span>
            <span className="oc-brand-meta">Tool No. 001</span>
          </div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--oc-faint)' }}>
          100% in your browser
        </span>
      </header>

      <main className="oc-import-main">
        <div className="oc-step">Step 1 · Import</div>
        <div className="oc-hero">
          <h1>Paste your name–manager CSV</h1>
          <p>
            We’ll clean dirty rows, show repairs, then open a full sandbox to
            rearrange people and watch SPOC numbers update.
          </p>
        </div>

        <section className="oc-card">
          <div className="oc-card-head">
            <strong>CSV input</strong>
            <span>name / manager · flexible headers</span>
          </div>
          <textarea
            className="oc-textarea"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'Name, Manager\nAva Chen,\nJordan Lee, Ava Chen'}
            spellCheck={false}
            aria-label="CSV input"
          />
          <div className="oc-actions-row">
            <button
              type="button"
              className="oc-btn oc-btn-primary"
              onClick={() => buildFromCsv(csvText)}
            >
              Build & continue
            </button>
            <button
              type="button"
              className="oc-btn oc-btn-secondary"
              onClick={() => {
                setCsvText(DEMO_CSV)
                buildFromCsv(DEMO_CSV)
              }}
            >
              Try demo data
            </button>
          </div>
          {error ? <p className="oc-error">{error}</p> : null}
        </section>

        {working && previewStats ? (
          <section className="oc-card oc-card-enter">
            <div className="oc-preview-head">
              <strong>Ready · {previewStats.people} people in tree</strong>
              <div className="oc-preview-pills">
                {repairs.map((r) => (
                  <span
                    key={r.message}
                    className={
                      r.kind === 'orphan' || r.kind === 'cycle'
                        ? 'oc-pill oc-pill-amber'
                        : 'oc-pill'
                    }
                  >
                    {r.count != null ? `×${r.count} ` : ''}
                    {r.kind.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
            <div className="oc-stat-grid">
              <div className="oc-stat">
                <span className="oc-stat-label">Managers</span>
                <div className="oc-stat-value">{previewStats.managers}</div>
              </div>
              <div className="oc-stat">
                <span className="oc-stat-label">Avg span</span>
                <div className="oc-stat-value">{previewStats.avgSpan}</div>
              </div>
              <div
                className={
                  previewStats.depth >= 6 ? 'oc-stat oc-stat-amber' : 'oc-stat'
                }
              >
                <span className="oc-stat-label">Depth</span>
                <div className="oc-stat-value">{previewStats.depth}</div>
              </div>
            </div>
            <div className="oc-preview-foot">
              <p>Next: Move, Remove, Add — SPOC updates live</p>
              <button
                type="button"
                className="oc-btn oc-btn-primary"
                onClick={openSandbox}
              >
                Open sandbox →
              </button>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="oc-footer">
        <span>Built by Steven Shoemaker · Tool No. 001</span>
        <span>Runs in your browser · nothing uploaded</span>
      </footer>
    </div>
  )
}
