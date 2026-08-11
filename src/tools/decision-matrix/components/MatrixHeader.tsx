import { useRef, useState } from 'react'
import type { DecisionMatrixApi } from '../model/useDecisionMatrix'

type Props = {
  api: DecisionMatrixApi
}

export function MatrixHeader({ api }: Props) {
  const { state, setTitle } = api
  const [exportOpen, setExportOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      if (!api.importJson(text)) {
        api.dismissToast()
        window.alert('Could not import that file. Use a decision-matrix JSON export.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <header className="dm-header">
      <div className="dm-header-left">
        <div className="dm-header-icon" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="5" height="5" rx="1" fill="white" opacity="0.9" />
            <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.55" />
            <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.55" />
            <rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity="0.35" />
          </svg>
        </div>
        <div className="dm-header-title">
          <span className="dm-header-label">Tool No. 002</span>
          <input
            className="dm-title-input"
            value={state.title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Decision title"
            aria-label="Decision title"
          />
        </div>
      </div>

      <div className="dm-header-actions">
        <button
          type="button"
          className="dm-btn dm-btn-ghost"
          onClick={api.copyShareLink}
        >
          Share
        </button>

        <div className="dm-export-wrap">
          <button
            type="button"
            className="dm-btn dm-btn-secondary"
            aria-expanded={exportOpen}
            aria-haspopup="menu"
            onClick={() => setExportOpen((o) => !o)}
          >
            Export
          </button>
          {exportOpen && (
            <>
              <button
                type="button"
                className="dm-export-backdrop"
                aria-label="Close export menu"
                onClick={() => setExportOpen(false)}
              />
              <div className="dm-export-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="dm-export-item"
                  onClick={() => {
                    void api.copyMarkdown()
                    setExportOpen(false)
                  }}
                >
                  Copy markdown summary
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="dm-export-item"
                  onClick={() => {
                    api.downloadCsv()
                    setExportOpen(false)
                  }}
                >
                  Download CSV
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="dm-export-item"
                  onClick={() => {
                    api.downloadJson()
                    setExportOpen(false)
                  }}
                >
                  Download JSON
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="dm-export-item"
                  onClick={() => {
                    fileRef.current?.click()
                    setExportOpen(false)
                  }}
                >
                  Import JSON…
                </button>
              </div>
            </>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="dm-sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onImport(f)
            e.target.value = ''
          }}
        />

        <button
          type="button"
          className="dm-btn dm-btn-ghost"
          onClick={api.resetToDemo}
        >
          Sample
        </button>
        <button
          type="button"
          className="dm-btn dm-btn-ghost dm-btn-danger-text"
          onClick={() => {
            if (
              state.options.length === 0 &&
              state.criteria.length === 0
            ) {
              return
            }
            if (window.confirm('Clear all options, criteria, and scores?')) {
              api.clearAll()
            }
          }}
        >
          Clear
        </button>
      </div>
    </header>
  )
}
