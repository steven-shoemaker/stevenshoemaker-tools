import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import {
  ancestorIds,
  buildPersonSearchIndex,
  searchPeople,
  type SearchHit,
} from '../model/search'
import type { Person } from '../model/types'
import { HighlightName } from './HighlightName'

type Props = {
  people: Person[]
  onSelect: (id: string) => void
  onReveal: (personId: string, ancestorIds: string[]) => void
  onQueryChange?: (query: string) => void
  inputRef?: RefObject<HTMLInputElement | null>
}

const PAGE = 60
const DEBOUNCE_MS = 120

export function TreeSearch({
  people,
  onSelect,
  onReveal,
  onQueryChange,
  inputRef,
}: Props) {
  const listId = useId()
  const localRef = useRef<HTMLInputElement>(null)
  const input = inputRef ?? localRef
  const [rawQuery, setRawQuery] = useState('')
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [panelOpen, setPanelOpen] = useState(false)
  const lastJumped = useRef<string | null>(null)

  const index = useMemo(() => buildPersonSearchIndex(people), [people])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQuery(rawQuery)
      onQueryChange?.(rawQuery.trim())
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [rawQuery, onQueryChange])

  const result = useMemo(
    () =>
      searchPeople(index, {
        query,
        placements: ['inTree'],
        limit: PAGE,
      }),
    [index, query],
  )

  const hits = result.hits
  const total = result.total
  const q = query.trim()

  const jumpTo = useCallback(
    (hit: SearchHit, closePanel = false) => {
      if (lastJumped.current === hit.id && !closePanel) {
        // Still re-reveal so collapsed ancestors re-open after Collapse
      }
      lastJumped.current = hit.id
      const ancestors = ancestorIds(index, hit.id)
      onReveal(hit.id, ancestors)
      onSelect(hit.id)
      if (closePanel) setPanelOpen(false)
    },
    [index, onReveal, onSelect],
  )

  // When the debounced query changes, jump to the best match
  const firstHitId = hits[0]?.id ?? null
  useEffect(() => {
    setActiveIndex(0)
    lastJumped.current = null
    if (!q || !hits[0]) return
    jumpTo(hits[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settle on query / top hit only
  }, [q, firstHitId])

  const go = (delta: number) => {
    if (hits.length === 0) return
    setActiveIndex((i) => {
      const next = (i + delta + hits.length) % hits.length
      const hit = hits[next]
      if (hit) jumpTo(hit)
      return next
    })
    setPanelOpen(true)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      go(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      go(-1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (hits.length === 0) return
      if (e.shiftKey) go(-1)
      else {
        const hit = hits[activeIndex]
        if (hit) jumpTo(hit, true)
        else go(1)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setRawQuery('')
      setQuery('')
      setPanelOpen(false)
      input.current?.blur()
    }
  }

  return (
    <div className="oc-tree-search">
      <div className="oc-tree-search-bar">
        <svg
          className="oc-tree-search-icon"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden
        >
          <circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M9.2 9.2L12 12"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <input
          ref={input}
          className="oc-tree-search-input"
          value={rawQuery}
          onChange={(e) => {
            setRawQuery(e.target.value)
            setPanelOpen(true)
          }}
          onFocus={() => {
            if (rawQuery.trim()) setPanelOpen(true)
          }}
          onKeyDown={onKeyDown}
          placeholder="Find in tree…"
          aria-label="Find person in tree"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-expanded={panelOpen && q.length > 0}
          autoComplete="off"
          spellCheck={false}
        />
        {q ? (
          <span className="oc-tree-search-meta" aria-live="polite">
            {total === 0
              ? 'No matches'
              : `${Math.min(activeIndex + 1, hits.length)} / ${total.toLocaleString()}`}
          </span>
        ) : (
          <kbd className="oc-tree-search-kbd">⌘F</kbd>
        )}
        {q && hits.length > 0 ? (
          <div className="oc-tree-search-nav">
            <button
              type="button"
              className="oc-tree-search-nav-btn"
              aria-label="Previous match"
              onClick={() => go(-1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="oc-tree-search-nav-btn"
              aria-label="Next match"
              onClick={() => go(1)}
            >
              ↓
            </button>
          </div>
        ) : null}
        {rawQuery ? (
          <button
            type="button"
            className="oc-tree-search-clear"
            aria-label="Clear search"
            onClick={() => {
              setRawQuery('')
              setQuery('')
              onQueryChange?.('')
              setPanelOpen(false)
              lastJumped.current = null
              input.current?.focus()
            }}
          >
            ×
          </button>
        ) : null}
      </div>

      {panelOpen && q ? (
        <div
          id={listId}
          className="oc-tree-search-panel"
          role="listbox"
          aria-label="Search results"
        >
          {hits.length === 0 ? (
            <p className="oc-tree-search-empty">No one matches “{q}”</p>
          ) : (
            <>
              <ul className="oc-tree-search-list">
                {hits.map((hit, i) => {
                  const manager = hit.managerId
                    ? index.byId.get(hit.managerId)?.name
                    : null
                  const active = i === activeIndex
                  return (
                    <li key={hit.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={
                          active
                            ? 'oc-tree-search-hit is-active'
                            : 'oc-tree-search-hit'
                        }
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => {
                          setActiveIndex(i)
                          jumpTo(hit, true)
                        }}
                      >
                        <strong>
                          <HighlightName name={hit.name} query={q} />
                        </strong>
                        <span>
                          {manager ? `Reports to ${manager}` : 'Root'}
                          {(index.directsCount.get(hit.id) ?? 0) > 0
                            ? ` · ${index.directsCount.get(hit.id)} directs`
                            : ' · IC'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {total > hits.length ? (
                <p className="oc-tree-search-more">
                  Showing {hits.length.toLocaleString()} of{' '}
                  {total.toLocaleString()} — refine your search to narrow
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
