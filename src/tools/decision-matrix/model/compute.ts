import type {
  CriterionBreakdown,
  MatrixCompute,
  MatrixState,
  OptionResult,
} from './types'
import { scoreKey } from './types'

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

  return { results, totalWeight, hasWeights, hasScores }
}

function clampScore(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}
