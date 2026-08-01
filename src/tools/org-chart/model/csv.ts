import type { ImportRepair, ImportResult, Person } from './types'
import { computeStats, breakCycles } from './graph'

function newId(): string {
  return crypto.randomUUID()
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i += 1
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      row.push(cell)
      cell = ''
      continue
    }
    if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }
    if (ch === '\r') continue
    cell += ch
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows.filter((r) => r.some((c) => c.trim().length > 0))
}

function detectColumns(header: string[]): { nameIdx: number; managerIdx: number } | null {
  let nameIdx = -1
  let managerIdx = -1

  header.forEach((h, i) => {
    const n = normalizeHeader(h)
    if (
      nameIdx < 0 &&
      (n === 'name' || n === 'employeename' || n === 'fullname' || n === 'employee')
    ) {
      nameIdx = i
    }
    if (
      managerIdx < 0 &&
      (n === 'manager' ||
        n === 'managername' ||
        n === 'reports to' ||
        n === 'reportsto' ||
        n === 'supervisor' ||
        n === 'boss')
    ) {
      managerIdx = i
    }
  })

  if (nameIdx >= 0 && managerIdx >= 0) return { nameIdx, managerIdx }
  if (header.length >= 2 && nameIdx < 0 && managerIdx < 0) {
    return { nameIdx: 0, managerIdx: 1 }
  }
  if (nameIdx >= 0 && managerIdx < 0 && header.length >= 2) {
    return { nameIdx, managerIdx: nameIdx === 0 ? 1 : 0 }
  }
  return null
}

export function parseOrgCsv(text: string): ImportResult {
  const repairs: ImportRepair[] = []
  const rows = parseCsvRows(text.trim())

  if (rows.length === 0) {
    return {
      snapshot: { people: [] },
      repairs: [{ kind: 'blank_row', message: 'CSV is empty', count: 1 }],
      stats: computeStats([]),
    }
  }

  const maybeHeader = rows[0].map((c) => c.trim())
  const cols = detectColumns(maybeHeader)
  const hasHeader = cols !== null && maybeHeader.some((h) => /name|manager|employee|report/i.test(h))
  const dataRows = hasHeader ? rows.slice(1) : rows
  const columns =
    cols ??
    ({ nameIdx: 0, managerIdx: 1 } as const)

  type Raw = { id: string; name: string; managerName: string }
  const raws: Raw[] = []
  let emptyNames = 0

  for (const row of dataRows) {
    const name = (row[columns.nameIdx] ?? '').trim()
    const managerName = (row[columns.managerIdx] ?? '').trim()
    if (!name && !managerName) continue
    if (!name) {
      emptyNames += 1
      continue
    }
    raws.push({ id: newId(), name, managerName })
  }

  if (emptyNames > 0) {
    repairs.push({
      kind: 'empty_name',
      message: `Skipped ${emptyNames} row${emptyNames === 1 ? '' : 's'} with empty name`,
      count: emptyNames,
    })
  }

  const nameCounts = new Map<string, number>()
  for (const r of raws) {
    const key = r.name.toLowerCase()
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1)
  }
  const dupes = [...nameCounts.values()].filter((n) => n > 1).reduce((a, b) => a + b, 0)
  if (dupes > 0) {
    const dupeNames = [...nameCounts.entries()].filter(([, n]) => n > 1).length
    repairs.push({
      kind: 'duplicate_name',
      message: `${dupeNames} duplicate name${dupeNames === 1 ? '' : 's'} kept as separate people`,
      count: dupeNames,
    })
  }

  const byNormName = new Map<string, string[]>()
  for (const r of raws) {
    const key = r.name.toLowerCase()
    const list = byNormName.get(key) ?? []
    list.push(r.id)
    byNormName.set(key, list)
  }

  let selfReports = 0
  let orphans = 0
  const people: Person[] = raws.map((r) => {
    if (!r.managerName) {
      return {
        id: r.id,
        name: r.name,
        managerId: null,
        placement: 'inTree' as const,
      }
    }
    if (r.managerName.toLowerCase() === r.name.toLowerCase()) {
      selfReports += 1
      return {
        id: r.id,
        name: r.name,
        managerId: null,
        placement: 'unassigned' as const,
        unknownManagerLabel: r.managerName,
      }
    }
    const matches = byNormName.get(r.managerName.toLowerCase()) ?? []
    if (matches.length === 0) {
      orphans += 1
      return {
        id: r.id,
        name: r.name,
        managerId: null,
        placement: 'unassigned' as const,
        unknownManagerLabel: r.managerName,
      }
    }
    // Prefer a manager who isn't this person; first match wins for ambiguous names
    const managerId = matches.find((id) => id !== r.id) ?? matches[0]
    return {
      id: r.id,
      name: r.name,
      managerId,
      placement: 'inTree' as const,
    }
  })

  if (selfReports > 0) {
    repairs.push({
      kind: 'self_report',
      message: `${selfReports} self-report${selfReports === 1 ? '' : 's'} → Unassigned`,
      count: selfReports,
    })
  }
  if (orphans > 0) {
    repairs.push({
      kind: 'orphan',
      message: `${orphans} unknown manager${orphans === 1 ? '' : 's'} → Unassigned`,
      count: orphans,
    })
  }

  const { people: acyclic, broken } = breakCycles(people)
  if (broken > 0) {
    repairs.push({
      kind: 'cycle',
      message: `Broke ${broken} reporting cycle${broken === 1 ? '' : 's'}`,
      count: broken,
    })
  }

  return {
    snapshot: { people: acyclic },
    repairs,
    stats: computeStats(acyclic),
  }
}

export function toCsv(people: Person[]): string {
  const lines = ['Name,Manager']
  const byId = new Map(people.map((p) => [p.id, p]))

  for (const person of people) {
    if (person.placement === 'removed') continue
    const manager =
      person.placement === 'unassigned' || !person.managerId
        ? ''
        : (byId.get(person.managerId)?.name ?? '')
    const escape = (v: string) =>
      /["\n,]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    lines.push(`${escape(person.name)},${escape(manager)}`)
  }
  return `${lines.join('\n')}\n`
}
