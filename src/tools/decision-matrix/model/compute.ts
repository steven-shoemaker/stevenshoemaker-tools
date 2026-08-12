import type {
  CriterionBreakdown,
  MatrixCompute,
  MatrixState,
  OptionResult,
} from './types'
import { scoreKey } from './types'

/**
 * Percentages are shares of the total weight, so they must read as 100.
 * Rounding each independently shows 33/33/33 = 99; largest-remainder gives the
 * leftover point to the criterion that was rounded down hardest.
 */
function sharePercents(
  criteria: MatrixState['criteria'],
  totalWeight: number,
): Record<string, number> {
  const out: Record<string, number> = {}
  if (totalWeight <= 0) {
    for (const c of criteria) out[c.id] = 0
    return out
  }

  const parts = criteria.map((c) => {
    const exact = (c.weight / totalWeight) * 100
    const floor = Math.floor(exact)
    return { id: c.id, weight: c.weight, floor, remainder: exact - floor }
  })

  let leftover = 100 - parts.reduce((sum, p) => sum + p.floor, 0)
  // A zero-weight criterion must stay at 0%, so it never takes a leftover point.
  const eligible = parts
    .filter((p) => p.weight > 0)
    .sort((a, b) => b.remainder - a.remainder)

  for (const p of eligible) {
    if (leftover <= 0) break
    p.floor += 1
    leftover -= 1
  }

  for (const p of parts) out[p.id] = p.floor
  return out
}

export function computeMatrix(state: MatrixState): MatrixCompute {
  const totalWeight = state.criteria.reduce((sum, c) => sum + c.weight, 0)
  const hasWeights = totalWeight > 0
  const weightShare = (weight: number) =>
    hasWeights ? weight / totalWeight : 0

  const maxPossible = hasWeights ? state.scaleMax : 0

  const raw: Omit<OptionResult, 'rank'>[] = state.options.map((option) => {
    const breakdown: CriterionBreakdown[] = state.criteria.map((criterion) => {
      const key = scoreKey(option.id, criterion.id)
      const score = clampScore(
        state.scores[key] ?? state.scaleMin,
        state.scaleMin,
        state.scaleMax,
      )
      const share = weightShare(criterion.weight)
      const contribution = hasWeights ? share * score : 0

      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        weight: criterion.weight,
        weightShare: share,
        score,
        contribution,
      }
    })

    const total = breakdown.reduce((sum, b) => sum + b.contribution, 0)
    const percent =
      maxPossible > 0 ? Math.round((total / maxPossible) * 1000) / 10 : 0

    return {
      optionId: option.id,
      optionName: option.name,
      total,
      maxPossible,
      percent,
      breakdown,
    }
  })

  const sorted = [...raw].sort((a, b) => b.total - a.total || a.optionName.localeCompare(b.optionName))
  const results: OptionResult[] = sorted.map((r, i) => ({
    ...r,
    rank: i + 1,
  }))

  const hasScores =
    state.options.length > 0 &&
    state.criteria.length > 0 &&
    state.options.some((o) =>
      state.criteria.some((c) => {
        const key = scoreKey(o.id, c.id)
        return key in state.scores
      }),
    )

  return {
    results,
    totalWeight,
    hasWeights,
    hasScores,
    shares: sharePercents(state.criteria, totalWeight),
  }
}

function clampScore(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}
