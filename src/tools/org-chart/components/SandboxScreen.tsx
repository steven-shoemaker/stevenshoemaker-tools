import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getDirects,
  removedPeople,
  unassignedPeople,
} from '../model/graph'
import { buildPersonSearchIndex, searchPeople } from '../model/search'
import type { OrgChartApi } from '../model/useOrgChart'
import { AnimatedNumber } from './AnimatedNumber'
import { Dialogs } from './Dialogs'
import { TreeSearch } from './TreeSearch'
import { TreeView } from './TreeView'

type Props = {
  api: OrgChartApi
}

function delta(current: number, baseline: number): string | null {
  const d = Math.round((current - baseline) * 10) / 10
  if (d === 0) return null
  return d > 0 ? `↑${d}` : `↓${Math.abs(d)}`
}

export function SandboxScreen({ api }: Props) {
  const {
    working,
    stats,
    baselineStats,
    selectedId,
    setSelectedId,
    setDialog,
    backToImport,
    undo,
    redo,
    canUndo,
    canRedo,
    downloadCsv,
    runMove,
    runMakeRoot,
    justMovedId,
    error,
  } = api

  const [expandKey, setExpandKey] = useState(0)
  const [collapseKey, setCollapseKey] = useState(0)
  const [ensureOpenIds, setEnsureOpenIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [revealId, setRevealId] = useState<string | null>(null)
  const [revealToken, setRevealToken] = useState(0)
  const [highlightQuery, setHighlightQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'f') return
      const t = e.target
      if (
        t instanceof HTMLElement &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable) &&
        t !== searchInputRef.current
      ) {
        return
      }
      e.preventDefault()
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const searchIndex = useMemo(
    () => (working ? buildPersonSearchIndex(working.people) : null),
    [working],
  )
  const matchIds = useMemo(() => {
    if (!searchIndex || !highlightQuery.trim()) return new Set<string>()
    const { hits } = searchPeople(searchIndex, {
      query: highlightQuery,
      placements: ['inTree'],
      limit: 500,
    })
    return new Set(hits.map((h) => h.id))
  }, [searchIndex, highlightQuery])

  const selected = useMemo(
    () => working?.people.find((p) => p.id === selectedId) ?? null,
    [working, selectedId],
  )
  const selectedDirects = selected
    ? getDirects(working?.people ?? [], selected.id).length
    : 0
  const unassigned = working ? unassignedPeople(working.people) : []
  const removed = working ? removedPeople(working.people) : []
  const managerName =
    selected?.managerId && working
      ? working.people.find((p) => p.id === selected.managerId)?.name
      : null

  if (!working || !stats) return null

  return (
    <div className="oc-sandbox">
      <header className="oc-sandbox-top">
        <div className="oc-sandbox-top-left">
          <button
            type="button"
            className="oc-btn oc-btn-secondary"
            onClick={backToImport}
          >
            ← Import
          </button>
          <div className="oc-divider" />
          <div className="oc-sandbox-title">
            <strong>Sandbox</strong>
            <span>
              {stats.people} in tree · Move, Remove, Add — all local
            </span>
          </div>
        </div>
        <div className="oc-sandbox-top-right">
          <span className="oc-pill oc-pill-green">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: 'var(--oc-green)',
              }}
            />
            Saved locally
          </span>
          <button
            type="button"
            className="oc-btn oc-btn-secondary"
            disabled={!canUndo}
            onClick={undo}
          >
            Undo
          </button>
          <button
            type="button"
            className="oc-btn oc-btn-secondary"
            disabled={!canRedo}
            onClick={redo}
          >
            Redo
          </button>
          <button
            type="button"
            className="oc-btn oc-btn-secondary"
            onClick={() => setDialog({ type: 'reset' })}
          >
            Reset
          </button>
          <button
            type="button"
            className="oc-btn oc-btn-primary"
            onClick={downloadCsv}
          >
            Download CSV
          </button>
        </div>
      </header>

      {error ? (
        <div
          style={{
            padding: '8px 20px',
            background: '#FEF2F2',
            color: 'var(--oc-red)',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      <div className="oc-workspace">
        <aside className="oc-rail">
          <div>
            <div className="oc-rail-label">LIVE SPOC</div>
            <div className="oc-rail-sub">Updates as you reassign</div>
          </div>

          <div className="oc-metric-grid">
            <Metric label="People" value={stats.people} />
            <Metric label="Managers" value={stats.managers} />
            <Metric
              label="Avg span"
              value={stats.avgSpan}
              decimals={1}
              deltaText={
                baselineStats
                  ? delta(stats.avgSpan, baselineStats.avgSpan)
                  : null
              }
            />
            <Metric
              label="Max span"
              value={stats.maxSpan}
              deltaText={
                baselineStats
                  ? delta(stats.maxSpan, baselineStats.maxSpan)
                  : null
              }
              tone={
                baselineStats && stats.maxSpan < baselineStats.maxSpan
                  ? 'green'
                  : undefined
              }
            />
            <Metric
              label="Depth"
              value={stats.depth}
              tone={stats.depth >= 6 ? 'amber' : undefined}
            />
            <Metric label="IC / Mgr" value={stats.icPerMgr} decimals={1} />
          </div>

          <div className="oc-selected">
            <div className="oc-rail-label">SELECTED</div>
            {selected && selected.placement === 'inTree' ? (
              <>
                <h2>{selected.name}</h2>
                <p>
                  {managerName
                    ? `Reports to ${managerName}`
                    : 'Root'}
                  {selectedDirects > 0
                    ? ` · ${selectedDirects} directs`
                    : ' · IC'}
                </p>
                <div className="oc-selected-actions">
                  <button
                    type="button"
                    className="oc-btn oc-btn-primary"
                    onClick={() =>
                      setDialog({ type: 'move', personId: selected.id })
                    }
                  >
                    Move…
                  </button>
                  <button
                    type="button"
                    className="oc-btn oc-btn-secondary"
                    onClick={() => runMakeRoot(selected.id)}
                  >
                    Make root
                  </button>
                  <button
                    type="button"
                    className="oc-btn oc-btn-secondary"
                    disabled={selectedDirects === 0}
                    onClick={() =>
                      setDialog({
                        type: 'collect',
                        personId: selected.id,
                        thenRemove: false,
                      })
                    }
                  >
                    Collect directs…
                  </button>
                  <button
                    type="button"
                    className="oc-btn oc-btn-danger-outline"
                    onClick={() =>
                      setDialog({ type: 'remove', personId: selected.id })
                    }
                  >
                    Remove…
                  </button>
                </div>
              </>
            ) : (
              <p>Select someone in the tree to Move, Collect, or Remove.</p>
            )}
          </div>

          <div className="oc-tray oc-tray-amber">
            <div className="oc-tray-head">
              <strong>UNASSIGNED · {unassigned.length}</strong>
              <span style={{ fontSize: 11, color: 'var(--oc-muted)' }}>
                No manager
              </span>
            </div>
            {unassigned.length === 0 ? (
              <p className="oc-modal-sub">None — clean structure</p>
            ) : (
              unassigned.map((p) => (
                <div key={p.id} className="oc-tray-item oc-tray-item-amber">
                  <span>
                    <strong>{p.name}</strong>
                    <span>{p.unknownManagerLabel ?? 'No manager'}</span>
                  </span>
                  <button
                    type="button"
                    className="oc-tray-action"
                    onClick={() =>
                      setDialog({ type: 'move', personId: p.id })
                    }
                  >
                    Assign
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="oc-tray">
            <div className="oc-tray-head">
              <strong style={{ color: 'var(--oc-faint)' }}>
                REMOVED · {removed.length}
              </strong>
              <span style={{ fontSize: 11, color: 'var(--oc-faint)' }}>
                Not in export
              </span>
            </div>
            {removed.map((p) => (
              <div key={p.id} className="oc-tray-item">
                <strong>{p.name}</strong>
                <button
                  type="button"
                  className="oc-tray-action"
                  onClick={() =>
                    setDialog({ type: 'restore', personId: p.id })
                  }
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="oc-tree-pane">
          <div className="oc-tree-toolbar">
            <TreeSearch
              people={working.people}
              inputRef={searchInputRef}
              onSelect={setSelectedId}
              onQueryChange={setHighlightQuery}
              onReveal={(personId, ancestors) => {
                setEnsureOpenIds(new Set(ancestors))
                setRevealId(personId)
                setRevealToken((t) => t + 1)
              }}
            />
            <div className="oc-actions-row">
              <button
                type="button"
                className="oc-btn oc-btn-primary"
                onClick={() => setDialog({ type: 'add' })}
              >
                Add person
              </button>
              <button
                type="button"
                className="oc-btn oc-btn-secondary"
                onClick={() => setExpandKey((k) => k + 1)}
                title={
                  stats.people > 500
                    ? 'Expanding very large trees can be slow'
                    : undefined
                }
              >
                Expand all
              </button>
              <button
                type="button"
                className="oc-btn oc-btn-secondary"
                onClick={() => setCollapseKey((k) => k + 1)}
              >
                Collapse
              </button>
            </div>
          </div>
          <p className="oc-tree-hint">
            Drag to Move · ⌘F to find · Move… for reassignment
          </p>
          <TreeView
            people={working.people}
            selectedId={selectedId}
            justMovedId={justMovedId}
            onSelect={setSelectedId}
            onMove={runMove}
            onOpenMove={(id) => setDialog({ type: 'move', personId: id })}
            expandAllKey={expandKey}
            collapsedAllKey={collapseKey}
            ensureOpenIds={ensureOpenIds}
            revealId={revealId}
            revealToken={revealToken}
            highlightQuery={highlightQuery}
            matchIds={matchIds}
          />
        </section>
      </div>

      <Dialogs api={api} />
    </div>
  )
}

function Metric({
  label,
  value,
  decimals = 0,
  deltaText,
  tone,
}: {
  label: string
  value: number
  decimals?: number
  deltaText?: string | null
  tone?: 'amber' | 'green'
}) {
  return (
    <div
      className={[
        'oc-metric',
        tone === 'amber' ? 'oc-stat-amber' : '',
        tone === 'green' ? 'oc-stat-green' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="oc-stat-label">{label}</span>
      <div className="oc-stat-value">
        <AnimatedNumber value={value} decimals={decimals} />
        {deltaText ? (
          <span className="oc-metric-delta">{deltaText}</span>
        ) : null}
      </div>
    </div>
  )
}
