import type { MatrixState } from './types'

const KEY = 'decision-matrix-tool:v1'

export function loadState(): MatrixState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as MatrixState
    if (!Array.isArray(data?.options) || !Array.isArray(data?.criteria)) {
      return null
    }
    return data
  } catch {
    return null
  }
}

export function saveState(state: MatrixState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // quota / private mode
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
