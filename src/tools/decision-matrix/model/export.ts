import type { MatrixCompute, MatrixState } from './types'
import { scoreKey } from './types'

export function toMarkdown(state: MatrixState, compute: MatrixCompute): string {
  const lines: string[] = []
  lines.push(`# ${state.title || 'Decision matrix'}`)
  lines.push('')
  lines.push('## Rankings')
  lines.push('')

  if (compute.results.length === 0) {
    lines.push('_No options yet._')
  } else {
    for (const r of compute.results) {
      const pct = compute.hasWeights ? ` (${r.percent}%)` : ''
      lines.push(`${r.rank}. **${r.optionName}** — ${formatNum(r.total)}${pct}`)
    }
  }

  lines.push('')
  lines.push('## Criteria weights')
  lines.push('')
  for (const c of state.criteria) {
    lines.push(`- ${c.name}: ${c.weight}`)
  }

  lines.push('')
  lines.push('## Score matrix')
  lines.push('')
  const header = ['Option', ...state.criteria.map((c) => c.name)]
  lines.push(`| ${header.join(' | ')} |`)
  lines.push(`| ${header.map(() => '---').join(' | ')} |`)
  for (const o of state.options) {
    const cells = state.criteria.map((c) => {
      const key = scoreKey(o.id, c.id)
      return String(state.scores[key] ?? state.scaleMin)
    })
    lines.push(`| ${o.name} | ${cells.join(' | ')} |`)
  }

  return lines.join('\n')
}

export function toCsv(state: MatrixState): string {
  const escape = (v: string) =>
    v.includes(',') || v.includes('"') || v.includes('\n')
      ? `"${v.replace(/"/g, '""')}"`
      : v

  const header = [
    'Option',
    ...state.criteria.map((c) => `${c.name} (weight ${c.weight})`),
  ]
  const rows = [header.map(escape).join(',')]

  for (const o of state.options) {
    const cells = [
      o.name,
      ...state.criteria.map((c) => {
        const key = scoreKey(o.id, c.id)
        return String(state.scores[key] ?? state.scaleMin)
      }),
    ]
    rows.push(cells.map(escape).join(','))
  }

  return rows.join('\n')
}

export function toJson(state: MatrixState): string {
  return JSON.stringify(state, null, 2)
}

export function downloadFile(
  filename: string,
  content: string,
  mime: string,
): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function formatNum(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2)
}
