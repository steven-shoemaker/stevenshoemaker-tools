import type { ChartSnapshot } from './types'

const KEY = 'org-chart-tool:v1'

export type PersistedState = {
  importSnapshot: ChartSnapshot
  working: ChartSnapshot
  past: ChartSnapshot[]
  future: ChartSnapshot[]
}

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as PersistedState
    if (!data?.working?.people || !data?.importSnapshot?.people) return null
    return data
  } catch {
    return null
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // quota / private mode — ignore
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
