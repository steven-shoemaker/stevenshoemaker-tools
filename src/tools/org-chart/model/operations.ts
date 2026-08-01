import type { ChartSnapshot, DirectPlacement, Person } from './types'
import { canMoveUnder, clonePeople, getDirects } from './graph'

function withPeople(
  snapshot: ChartSnapshot,
  mutate: (people: Person[]) => void,
): ChartSnapshot {
  const people = clonePeople(snapshot.people)
  mutate(people)
  return { people }
}

export function movePerson(
  snapshot: ChartSnapshot,
  personId: string,
  managerId: string | null,
): ChartSnapshot {
  const check = canMoveUnder(snapshot.people, personId, managerId)
  if (!check.ok) throw new Error(check.reason)

  return withPeople(snapshot, (people) => {
    const person = people.find((p) => p.id === personId)
    if (!person || person.placement === 'removed') return
    person.managerId = managerId
    person.placement = 'inTree'
    delete person.unknownManagerLabel
  })
}

export function makeRoot(snapshot: ChartSnapshot, personId: string): ChartSnapshot {
  return movePerson(snapshot, personId, null)
}

export function applyDirectPlacements(
  snapshot: ChartSnapshot,
  managerId: string,
  placements: Record<string, DirectPlacement>,
): ChartSnapshot {
  return withPeople(snapshot, (people) => {
    for (const direct of getDirects(people, managerId)) {
      const placement = placements[direct.id]
      if (!placement) {
        direct.managerId = null
        direct.placement = 'unassigned'
        direct.unknownManagerLabel = 'Left after collect'
        continue
      }
      if (placement.kind === 'unassigned') {
        direct.managerId = null
        direct.placement = 'unassigned'
        direct.unknownManagerLabel = 'Left after collect'
      } else if (placement.kind === 'root') {
        direct.managerId = null
        direct.placement = 'inTree'
        delete direct.unknownManagerLabel
      } else {
        const check = canMoveUnder(people, direct.id, placement.managerId)
        if (!check.ok) {
          direct.managerId = null
          direct.placement = 'unassigned'
          direct.unknownManagerLabel = check.reason
        } else {
          direct.managerId = placement.managerId
          direct.placement = 'inTree'
          delete direct.unknownManagerLabel
        }
      }
    }
  })
}

export function removePerson(
  snapshot: ChartSnapshot,
  personId: string,
): ChartSnapshot {
  return withPeople(snapshot, (people) => {
    const person = people.find((p) => p.id === personId)
    if (!person) return
    for (const direct of getDirects(people, personId)) {
      direct.managerId = null
      direct.placement = 'unassigned'
      direct.unknownManagerLabel = 'Left after collect'
    }
    person.managerId = null
    person.placement = 'removed'
    delete person.unknownManagerLabel
  })
}

export function restorePerson(
  snapshot: ChartSnapshot,
  personId: string,
  managerId: string | null,
): ChartSnapshot {
  return withPeople(snapshot, (people) => {
    const person = people.find((p) => p.id === personId)
    if (!person || person.placement !== 'removed') return
    if (managerId === null) {
      person.managerId = null
      person.placement = 'inTree'
      return
    }
    const check = canMoveUnder(people, personId, managerId)
    if (!check.ok) {
      person.managerId = null
      person.placement = 'unassigned'
      person.unknownManagerLabel = check.reason
      return
    }
    person.managerId = managerId
    person.placement = 'inTree'
  })
}

export function addPerson(
  snapshot: ChartSnapshot,
  name: string,
  managerId: string | null,
  asUnassigned = false,
): ChartSnapshot {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Name is required')

  return withPeople(snapshot, (people) => {
    const id = crypto.randomUUID()
    if (asUnassigned) {
      people.push({
        id,
        name: trimmed,
        managerId: null,
        placement: 'unassigned',
      })
      return
    }
    if (managerId !== null) {
      const provisional: Person = {
        id,
        name: trimmed,
        managerId: null,
        placement: 'inTree',
      }
      const check = canMoveUnder([...people, provisional], id, managerId)
      if (!check.ok) throw new Error(check.reason)
      people.push({
        id,
        name: trimmed,
        managerId,
        placement: 'inTree',
      })
      return
    }
    people.push({
      id,
      name: trimmed,
      managerId: null,
      placement: 'inTree',
    })
  })
}
