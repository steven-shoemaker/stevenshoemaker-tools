import type { Person, SpocStats } from './types'

export function activePeople(people: Person[]): Person[] {
  return people.filter((p) => p.placement !== 'removed')
}

export function inTreePeople(people: Person[]): Person[] {
  return people.filter((p) => p.placement === 'inTree')
}

export function unassignedPeople(people: Person[]): Person[] {
  return people.filter((p) => p.placement === 'unassigned')
}

export function removedPeople(people: Person[]): Person[] {
  return people.filter((p) => p.placement === 'removed')
}

export function getDirects(people: Person[], managerId: string): Person[] {
  return people.filter(
    (p) => p.placement === 'inTree' && p.managerId === managerId,
  )
}

export function getRoots(people: Person[]): Person[] {
  return people.filter((p) => p.placement === 'inTree' && p.managerId === null)
}

export function isInSubtree(
  people: Person[],
  ancestorId: string,
  candidateId: string,
): boolean {
  if (ancestorId === candidateId) return true
  const byId = new Map(people.map((p) => [p.id, p]))
  let current = byId.get(candidateId)
  const seen = new Set<string>()
  while (current?.managerId) {
    if (seen.has(current.id)) break
    seen.add(current.id)
    if (current.managerId === ancestorId) return true
    current = byId.get(current.managerId)
  }
  return false
}

export function canMoveUnder(
  people: Person[],
  personId: string,
  managerId: string | null,
): { ok: true } | { ok: false; reason: string } {
  if (managerId === null) return { ok: true }
  if (managerId === personId) {
    return { ok: false, reason: 'Someone can’t report to themselves' }
  }
  const manager = people.find((p) => p.id === managerId)
  if (!manager || manager.placement !== 'inTree') {
    return { ok: false, reason: 'Manager must be in the tree' }
  }
  if (isInSubtree(people, personId, managerId)) {
    return { ok: false, reason: 'Can’t Move under someone in their own subtree' }
  }
  return { ok: true }
}

export function breakCycles(people: Person[]): { people: Person[]; broken: number } {
  const byId = new Map(people.map((p) => [p.id, { ...p }]))
  let broken = 0

  for (const person of byId.values()) {
    if (person.placement !== 'inTree' || !person.managerId) continue
    const seen = new Set<string>()
    let current: Person | undefined = person
    while (current?.managerId) {
      if (seen.has(current.id)) {
        person.managerId = null
        person.placement = 'unassigned'
        person.unknownManagerLabel = person.unknownManagerLabel ?? 'cycle'
        broken += 1
        break
      }
      seen.add(current.id)
      current = byId.get(current.managerId)
    }
  }

  return { people: [...byId.values()], broken }
}

export function treeDepth(people: Person[]): number {
  const directs = new Map<string | null, Person[]>()
  for (const p of inTreePeople(people)) {
    const key = p.managerId
    const list = directs.get(key) ?? []
    list.push(p)
    directs.set(key, list)
  }

  const walk = (id: string | null, depth: number): number => {
    const kids = directs.get(id) ?? []
    if (kids.length === 0) return depth
    return Math.max(...kids.map((k) => walk(k.id, depth + 1)))
  }

  const roots = getRoots(people)
  if (roots.length === 0) return 0
  return Math.max(...roots.map((r) => walk(r.id, 1)))
}

export function computeStats(people: Person[]): SpocStats {
  const tree = inTreePeople(people)
  const managerIds = new Set(
    tree.filter((p) => p.managerId).map((p) => p.managerId as string),
  )
  const spans = [...managerIds].map((id) => getDirects(people, id).length)
  const managers = spans.length
  const avgSpan =
    managers === 0 ? 0 : spans.reduce((a, b) => a + b, 0) / managers
  const maxSpan = managers === 0 ? 0 : Math.max(...spans)
  const ics = tree.length - managers
  const icPerMgr = managers === 0 ? 0 : ics / managers

  return {
    people: tree.length,
    managers,
    avgSpan: Math.round(avgSpan * 10) / 10,
    maxSpan,
    depth: treeDepth(people),
    icPerMgr: Math.round(icPerMgr * 10) / 10,
  }
}

export type TreeNode = {
  person: Person
  children: TreeNode[]
}

export function buildForest(people: Person[]): TreeNode[] {
  const tree = inTreePeople(people)
  const byManager = new Map<string | null, Person[]>()
  for (const p of tree) {
    const list = byManager.get(p.managerId) ?? []
    list.push(p)
    byManager.set(p.managerId, list)
  }
  for (const list of byManager.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }

  const build = (person: Person): TreeNode => ({
    person,
    children: (byManager.get(person.id) ?? []).map(build),
  })

  return (byManager.get(null) ?? []).map(build)
}

export function clonePeople(people: Person[]): Person[] {
  return people.map((p) => ({ ...p }))
}
