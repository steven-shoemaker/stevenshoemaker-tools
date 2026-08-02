import { useEffect, useMemo, useRef, useState } from 'react'
import { buildForest, inTreePeople, type TreeNode } from '../model/graph'
import type { Person } from '../model/types'
import { HighlightName } from './HighlightName'

/** Above this, nodes start collapsed so we don't mount thousands of open branches. */
const COLLAPSE_DEFAULT_THRESHOLD = 200

type Props = {
  people: Person[]
  selectedId: string | null
  justMovedId: string | null
  onSelect: (id: string) => void
  onMove: (personId: string, managerId: string) => void
  onOpenMove: (personId: string) => void
  expandAllKey: number
  collapsedAllKey: number
  /** Ancestors that must stay open so `revealId` is visible */
  ensureOpenIds: ReadonlySet<string>
  revealId: string | null
  revealToken: number
  highlightQuery: string
  matchIds: ReadonlySet<string>
}

function Row({
  node,
  depth,
  selectedId,
  justMovedId,
  onSelect,
  onMove,
  onOpenMove,
  forceExpand,
  forceCollapse,
  ensureOpenIds,
  defaultOpen,
  highlightQuery,
  matchIds,
}: {
  node: TreeNode
  depth: number
  selectedId: string | null
  justMovedId: string | null
  onSelect: (id: string) => void
  onMove: (personId: string, managerId: string) => void
  onOpenMove: (personId: string) => void
  forceExpand: number
  forceCollapse: number
  ensureOpenIds: ReadonlySet<string>
  defaultOpen: boolean
  highlightQuery: string
  matchIds: ReadonlySet<string>
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [dropOver, setDropOver] = useState(false)
  const directs = node.children.length
  const isMatch = matchIds.has(node.person.id)
  const isSelected = selectedId === node.person.id

  useEffect(() => {
    if (forceExpand > 0) setOpen(true)
  }, [forceExpand])

  useEffect(() => {
    if (forceCollapse > 0) setOpen(false)
  }, [forceCollapse])

  useEffect(() => {
    if (ensureOpenIds.has(node.person.id)) setOpen(true)
  }, [ensureOpenIds, node.person.id])

  return (
    <>
      <div
        className={[
          'oc-row',
          isSelected ? 'oc-row-selected' : '',
          dropOver ? 'oc-row-drop' : '',
          justMovedId === node.person.id ? 'oc-row-just-moved' : '',
          isMatch ? 'oc-row-match' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ paddingLeft: 12 + depth * 24 }}
        data-person-id={node.person.id}
        onClick={() => onSelect(node.person.id)}
        onDragOver={(e) => {
          e.preventDefault()
          setDropOver(true)
        }}
        onDragLeave={() => setDropOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDropOver(false)
          const id = e.dataTransfer.getData('text/person-id')
          if (id) onMove(id, node.person.id)
        }}
      >
        <button
          type="button"
          className="oc-chevron"
          aria-label={open ? 'Collapse' : 'Expand'}
          onClick={(e) => {
            e.stopPropagation()
            if (directs > 0) setOpen((v) => !v)
          }}
          style={{ visibility: directs > 0 ? 'visible' : 'hidden' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d={open ? 'M3 4.5L6 7.5L9 4.5' : 'M4.5 3L7.5 6L4.5 9'}
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span
          className="oc-handle"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/person-id', node.person.id)
            e.dataTransfer.effectAllowed = 'move'
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Drag ${node.person.name}`}
        >
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
            {[3, 7, 11].flatMap((y) =>
              [3, 7].map((x) => (
                <circle
                  key={`${x}-${y}`}
                  cx={x}
                  cy={y}
                  r="1.1"
                  fill="currentColor"
                />
              )),
            )}
          </svg>
        </span>
        <div className="oc-row-main">
          <div className="oc-row-name">
            <HighlightName name={node.person.name} query={highlightQuery} />
          </div>
          <div className="oc-row-meta">
            {node.person.managerId == null ? 'Root' : 'Reports up'}
            {directs > 0
              ? ` · ${directs} direct${directs === 1 ? '' : 's'}`
              : ' · IC'}
            {dropOver ? ' · Drop target' : ''}
          </div>
        </div>
        <button
          type="button"
          className="oc-row-action"
          onClick={(e) => {
            e.stopPropagation()
            onOpenMove(node.person.id)
          }}
        >
          {dropOver ? 'Drop here' : 'Move'}
        </button>
      </div>
      {open
        ? node.children.map((child) => (
            <Row
              key={child.person.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              justMovedId={justMovedId}
              onSelect={onSelect}
              onMove={onMove}
              onOpenMove={onOpenMove}
              forceExpand={forceExpand}
              forceCollapse={forceCollapse}
              ensureOpenIds={ensureOpenIds}
              defaultOpen={defaultOpen}
              highlightQuery={highlightQuery}
              matchIds={matchIds}
            />
          ))
        : null}
    </>
  )
}

export function TreeView({
  people,
  selectedId,
  justMovedId,
  onSelect,
  onMove,
  onOpenMove,
  expandAllKey,
  collapsedAllKey,
  ensureOpenIds,
  revealId,
  revealToken,
  highlightQuery,
  matchIds,
}: Props) {
  const forest = useMemo(() => buildForest(people), [people])
  const treeCount = useMemo(() => inTreePeople(people).length, [people])
  const defaultOpen = treeCount <= COLLAPSE_DEFAULT_THRESHOLD
  const scrollHostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!revealId) return
    const host = scrollHostRef.current
    if (!host) return
    // Wait a frame so ensureOpen can mount the row
    const id = window.requestAnimationFrame(() => {
      const el = host.querySelector(
        `[data-person-id="${CSS.escape(revealId)}"]`,
      )
      // Instant — search/keyboard jumps must not animate (Emil: high-frequency actions)
      el?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
    })
    return () => window.cancelAnimationFrame(id)
  }, [revealId, revealToken, ensureOpenIds])

  if (forest.length === 0) {
    return (
      <div className="oc-empty">
        No one in the tree yet. Assign Unassigned people or Add person.
      </div>
    )
  }

  return (
    <div className="oc-tree-card" ref={scrollHostRef}>
      {forest.map((node) => (
        <Row
          key={node.person.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          justMovedId={justMovedId}
          onSelect={onSelect}
          onMove={onMove}
          onOpenMove={onOpenMove}
          forceExpand={expandAllKey}
          forceCollapse={collapsedAllKey}
          ensureOpenIds={ensureOpenIds}
          defaultOpen={defaultOpen}
          highlightQuery={highlightQuery}
          matchIds={matchIds}
        />
      ))}
    </div>
  )
}
