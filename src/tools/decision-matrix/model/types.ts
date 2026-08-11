export type Option = {
  id: string
  name: string
}

export type Criterion = {
  id: string
  name: string
  /** Relative importance; normalized at compute time */
  weight: number
}

export type ScoreMap = Record<string, number>

export type MatrixState = {
  title: string
  options: Option[]
  criteria: Criterion[]
  scores: ScoreMap
  /** Inclusive score range */
  scaleMin: number
  scaleMax: number
}

export type CriterionBreakdown = {
  criterionId: string
  criterionName: string
  weight: number
  weightShare: number
  score: number
  contribution: number
}

export type OptionResult = {
  optionId: string
  optionName: string
  rank: number
  total: number
  maxPossible: number
  percent: number
  breakdown: CriterionBreakdown[]
}

export type MatrixCompute = {
  results: OptionResult[]
  totalWeight: number
  hasWeights: boolean
  hasScores: boolean
}

export function scoreKey(optionId: string, criterionId: string): string {
  return `${optionId}:${criterionId}`
}

export function newId(): string {
  return crypto.randomUUID()
}
