import type { Person, Placement } from './types'
import { inTreePeople } from './graph'

export type SearchEntry = {
  id: string
  name: string
  nameLower: string
  managerId: string | null
  placement: Placement
}

export type PersonSearchIndex = {
  /** Sorted A–Z for stable empty-query browsing */
  entries: SearchEntry[]
  byId: Map<string, SearchEntry>
  /** managerId → child ids (in-tree only) */
  childrenOf: Map<string | null, string[]>
  directsCount: Map<string, number>
}

export type SearchHit = SearchEntry & {
  rank: number
  matchIndex: number
}

export type SearchResult = {
  hits: SearchHit[]
  total: number
}

const EMPTY_RESULT: SearchResult = { hits: [], total: 0 }

/** Build once per people snapshot — O(n log n) for sort. */
export function buildPersonSearchIndex(people: Person[]): PersonSearchIndex {
  const entries: SearchEntry[] = people.map((p) => ({
    id: p.id,
    name: p.name,
    nameLower: p.name.toLowerCase(),
    managerId: p.managerId,
    placement: p.placement,
  }))
  entries.sort((a, b) => a.nameLower.localeCompare(b.nameLower))

  const byId = new Map(entries.map((e) => [e.id, e]))
  const childrenOf = new Map<string | null, string[]>()
  const directsCount = new Map<string, number>()

  for (const p of inTreePeople(people)) {
    const key = p.managerId
    const list = childrenOf.get(key) ?? []
    list.push(p.id)
    childrenOf.set(key, list)
    if (p.managerId) {
      directsCount.set(p.managerId, (directsCount.get(p.managerId) ?? 0) + 1)
    }
  }

  return { entries, byId, childrenOf, directsCount }
}

export function ancestorIds(
  index: PersonSearchIndex,
  personId: string,
): string[] {
  const path: string[] = []
  let current = index.byId.get(personId)
  const seen = new Set<string>()
  while (current?.managerId) {
    if (seen.has(current.id)) break
    seen.add(current.id)
    path.push(current.managerId)
    current = index.byId.get(current.managerId)
  }
  return path
}

/** Descendants of `rootId` including itself — for move-cycle checks. */
export function descendantIds(
  index: PersonSearchIndex,
  rootId: string,
): Set<string> {
  const out = new Set<string>()
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    if (out.has(id)) continue
    out.add(id)
    const kids = index.childrenOf.get(id)
    if (kids) stack.push(...kids)
  }
  return out
}

export function createMoveChecker(
  index: PersonSearchIndex,
  personId: string,
): (managerId: string) => { ok: true } | { ok: false; reason: string } {
  const blocked = descendantIds(index, personId)
  return (managerId: string) => {
    if (managerId === personId) {
      return { ok: false, reason: 'Someone can’t report to themselves' }
    }
    const manager = index.byId.get(managerId)
    if (!manager || manager.placement !== 'inTree') {
      return { ok: false, reason: 'Manager must be in the tree' }
    }
    if (blocked.has(managerId)) {
      return {
        ok: false,
        reason: 'Can’t Move under someone in their own subtree',
      }
    }
    return { ok: true }
  }
}

type SearchOptions = {
  query: string
  /** Restrict to these placements (default: all) */
  placements?: Placement[]
  excludeId?: string
  /** Max hits to return (default 80) */
  limit?: number
  /** Skip first N matches for “load more” */
  offset?: number
  /**
   * When query is empty: return a browse page of candidates.
   * Default true for pickers; tree find returns nothing until typing.
   */
  allowEmpty?: boolean
}

/**
 * Substring search over pre-lowercased names.
 * O(n) scan — fine for ~10k with memoized index + debounced query.
 * Ranking: prefix (0) → word-boundary (1) → substring (2), then A–Z.
 */
export function searchPeople(
  index: PersonSearchIndex,
  options: SearchOptions,
): SearchResult {
  const {
    query,
    placements,
    excludeId,
    limit = 80,
    offset = 0,
    allowEmpty = false,
  } = options

  const q = query.trim().toLowerCase()
  const placementSet = placements ? new Set(placements) : null

  const matchesFilter = (e: SearchEntry) => {
    if (excludeId && e.id === excludeId) return false
    if (placementSet && !placementSet.has(e.placement)) return false
    return true
  }

  if (!q) {
    if (!allowEmpty) return EMPTY_RESULT
    const pool = index.entries.filter(matchesFilter)
    return {
      total: pool.length,
      hits: pool.slice(offset, offset + limit).map((e) => ({
        ...e,
        rank: 3,
        matchIndex: -1,
      })),
    }
  }

  const scored: SearchHit[] = []
  for (const e of index.entries) {
    if (!matchesFilter(e)) continue
    const idx = e.nameLower.indexOf(q)
    if (idx < 0) continue
    let rank = 2
    if (idx === 0) rank = 0
    else if (e.nameLower[idx - 1] === ' ' || e.nameLower[idx - 1] === '-') {
      rank = 1
    }
    scored.push({ ...e, rank, matchIndex: idx })
  }

  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    return a.nameLower.localeCompare(b.nameLower)
  })

  return {
    total: scored.length,
    hits: scored.slice(offset, offset + limit),
  }
}
