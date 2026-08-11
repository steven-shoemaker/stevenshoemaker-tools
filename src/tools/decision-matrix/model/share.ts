import type { MatrixState } from './types'

const HASH_PREFIX = 'm='

type SharePayload = {
  v: 1
  t: string
  o: Array<[string, string]>
  c: Array<[string, string, number]>
  s: Array<[string, number]>
  min: number
  max: number
}

export function encodeShareState(state: MatrixState): string {
  const payload: SharePayload = {
    v: 1,
    t: state.title,
    o: state.options.map((o) => [o.id, o.name]),
    c: state.criteria.map((c) => [c.id, c.name, c.weight]),
    s: Object.entries(state.scores),
    min: state.scaleMin,
    max: state.scaleMax,
  }
  const json = JSON.stringify(payload)
  const encoded = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${HASH_PREFIX}${encoded}`
}

export function decodeShareHash(hash: string): MatrixState | null {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash
    if (!raw.startsWith(HASH_PREFIX)) return null
    const encoded = raw.slice(HASH_PREFIX.length)
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padLen = (4 - (padded.length % 4)) % 4
    const base64 = padded + '='.repeat(padLen)
    const json = decodeURIComponent(escape(atob(base64)))
    const data = JSON.parse(json) as SharePayload
    if (data.v !== 1) return null

    return {
      title: data.t ?? '',
      options: data.o.map(([id, name]) => ({ id, name })),
      criteria: data.c.map(([id, name, weight]) => ({ id, name, weight })),
      scores: Object.fromEntries(data.s),
      scaleMin: data.min ?? 1,
      scaleMax: data.max ?? 5,
    }
  } catch {
    return null
  }
}

export function buildShareUrl(state: MatrixState): string {
  const hash = encodeShareState(state)
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#${hash}`
}

export function readShareFromLocation(): MatrixState | null {
  return decodeShareHash(window.location.hash)
}
