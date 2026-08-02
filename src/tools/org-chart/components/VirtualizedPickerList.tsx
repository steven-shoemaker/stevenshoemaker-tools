import { useMemo, useRef, useState, type UIEvent } from 'react'
import {
  buildPersonSearchIndex,
  createMoveChecker,
  searchPeople,
  type SearchHit,
} from '../model/search'
import type { Person } from '../model/types'
import { HighlightName } from './HighlightName'

const ROW_H = 48
const OVERSCAN = 6
const PAGE = 100
const VIEWPORT_H = 280

type Props = {
  people: Person[]
  personId: string
  query: string
  selectedManagerId: string | null
  onSelect: (id: string) => void
}

/**
 * Scroll-windowed manager picker — only ~20 DOM rows at a time.
 * Search scans the full index; we never mount thousands of buttons.
 */
export function VirtualizedPickerList({
  people,
  personId,
  query,
  selectedManagerId,
  onSelect,
}: Props) {
  const index = useMemo(() => buildPersonSearchIndex(people), [people])
  const check = useMemo(
    () => createMoveChecker(index, personId),
    [index, personId],
  )

  const { hits, total } = useMemo(
    () =>
      searchPeople(index, {
        query,
        placements: ['inTree'],
        excludeId: personId,
        limit: PAGE,
        allowEmpty: true,
      }),
    [index, query, personId],
  )

  const [scrollTop, setScrollTop] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  const totalHeight = hits.length * ROW_H
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN)
  const visibleCount = Math.ceil(VIEWPORT_H / ROW_H) + OVERSCAN * 2
  const end = Math.min(hits.length, start + visibleCount)
  const slice = hits.slice(start, end)
  const q = query.trim()

  if (hits.length === 0) {
    return (
      <p className="oc-modal-sub">
        {q ? 'No matches' : 'No managers in the tree'}
      </p>
    )
  }

  return (
    <div className="oc-picker">
      <div
        ref={scrollerRef}
        className="oc-picker-scroll"
        style={{ height: Math.min(VIEWPORT_H, totalHeight) }}
        onScroll={onScroll}
        role="listbox"
        aria-label="Manager candidates"
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {slice.map((hit, i) => {
            const indexInList = start + i
            return (
              <PickerRow
                key={hit.id}
                hit={hit}
                top={indexInList * ROW_H}
                query={q}
                directs={index.directsCount.get(hit.id) ?? 0}
                check={check(hit.id)}
                selected={selectedManagerId === hit.id}
                onSelect={onSelect}
              />
            )
          })}
        </div>
      </div>
      <p className="oc-picker-meta">
        {total > hits.length
          ? `Showing ${hits.length.toLocaleString()} of ${total.toLocaleString()} — type to refine`
          : `${total.toLocaleString()} ${total === 1 ? 'person' : 'people'}`}
        {!q ? ' · Type a name to filter' : null}
      </p>
    </div>
  )
}

function PickerRow({
  hit,
  top,
  query,
  directs,
  check,
  selected,
  onSelect,
}: {
  hit: SearchHit
  top: number
  query: string
  directs: number
  check: { ok: true } | { ok: false; reason: string }
  selected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={!check.ok}
      className={selected ? 'oc-result oc-result-active oc-picker-row' : 'oc-result oc-picker-row'}
      style={{ top, height: ROW_H }}
      onClick={() => onSelect(hit.id)}
    >
      <span>
        <strong>
          <HighlightName name={hit.name} query={query} />
        </strong>
        <span>
          {check.ok
            ? `${directs} direct${directs === 1 ? '' : 's'}${hit.managerId ? '' : ' · Root'}`
            : check.reason}
        </span>
      </span>
      <span className="oc-picker-row-action">
        {check.ok ? 'Select' : 'Blocked'}
      </span>
    </button>
  )
}
