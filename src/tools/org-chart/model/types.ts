export type Placement = 'inTree' | 'unassigned' | 'removed'

export type Person = {
  id: string
  name: string
  managerId: string | null
  placement: Placement
  /** Original manager string when it could not be resolved on import */
  unknownManagerLabel?: string
}

export type ChartSnapshot = {
  people: Person[]
}

export type SpocStats = {
  people: number
  managers: number
  avgSpan: number
  maxSpan: number
  depth: number
  icPerMgr: number
}

export type ImportRepair = {
  kind:
    | 'duplicate_name'
    | 'orphan'
    | 'self_report'
    | 'cycle'
    | 'empty_name'
    | 'blank_row'
  message: string
  count?: number
}

export type ImportResult = {
  snapshot: ChartSnapshot
  repairs: ImportRepair[]
  stats: SpocStats
}

export type DirectPlacement =
  | { kind: 'move'; managerId: string }
  | { kind: 'root' }
  | { kind: 'unassigned' }

export type DialogState =
  | { type: 'none' }
  | { type: 'move'; personId: string }
  | { type: 'collect'; personId: string; thenRemove: boolean }
  | { type: 'remove'; personId: string }
  | { type: 'restore'; personId: string }
  | { type: 'add' }
  | { type: 'reset' }
