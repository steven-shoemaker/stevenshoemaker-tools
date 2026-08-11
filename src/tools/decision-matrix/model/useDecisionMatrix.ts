import { useCallback, useEffect, useMemo, useState } from 'react'
import { computeMatrix } from './compute'
import { createDemoState } from './demo'
import { downloadFile, toCsv, toJson, toMarkdown } from './export'
import {
  buildShareUrl,
  encodeShareState,
  readShareFromLocation,
} from './share'
import { clearState, loadState, saveState } from './storage'
import type { MatrixState } from './types'
import { newId, scoreKey } from './types'

function initialState(): MatrixState {
  const shared = readShareFromLocation()
  if (shared) return shared
  const saved = loadState()
  if (saved) return saved
  return createDemoState()
}

export type DecisionMatrixApi = {
  state: MatrixState
  compute: ReturnType<typeof computeMatrix>
  sharedFromUrl: boolean
  toast: string | null
  setTitle: (title: string) => void
  addOption: () => void
  renameOption: (id: string, name: string) => void
  removeOption: (id: string) => void
  addCriterion: () => void
  renameCriterion: (id: string, name: string) => void
  setCriterionWeight: (id: string, weight: number) => void
  removeCriterion: (id: string) => void
  setScore: (optionId: string, criterionId: string, score: number) => void
  resetToDemo: () => void
  clearAll: () => void
  copyShareLink: () => Promise<void>
  copyMarkdown: () => Promise<void>
  downloadCsv: () => void
  downloadJson: () => void
  importJson: (json: string) => boolean
  dismissToast: () => void
}

export function useDecisionMatrix(): DecisionMatrixApi {
  const [state, setState] = useState<MatrixState>(initialState)
  const [sharedFromUrl] = useState(() => readShareFromLocation() !== null)
  const [toast, setToast] = useState<string | null>(null)

  const compute = useMemo(() => computeMatrix(state), [state])

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    if (!sharedFromUrl) return
    const hash = encodeShareState(state)
    window.history.replaceState(null, '', `#${hash}`)
  }, [state, sharedFromUrl])

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2400)
  }, [])

  const setTitle = useCallback((title: string) => {
    setState((s) => ({ ...s, title }))
  }, [])

  const addOption = useCallback(() => {
    const option = { id: newId(), name: `Option ${state.options.length + 1}` }
    setState((s) => ({
      ...s,
      options: [...s.options, option],
    }))
  }, [state.options.length])

  const renameOption = useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      options: s.options.map((o) => (o.id === id ? { ...o, name } : o)),
    }))
  }, [])

  const removeOption = useCallback((id: string) => {
    setState((s) => {
      const scores = { ...s.scores }
      for (const c of s.criteria) {
        delete scores[scoreKey(id, c.id)]
      }
      return {
        ...s,
        options: s.options.filter((o) => o.id !== id),
        scores,
      }
    })
  }, [])

  const addCriterion = useCallback(() => {
    const criterion = {
      id: newId(),
      name: `Criterion ${state.criteria.length + 1}`,
      weight: 20,
    }
    setState((s) => ({
      ...s,
      criteria: [...s.criteria, criterion],
    }))
  }, [state.criteria.length])

  const renameCriterion = useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      criteria: s.criteria.map((c) => (c.id === id ? { ...c, name } : c)),
    }))
  }, [])

  const setCriterionWeight = useCallback((id: string, weight: number) => {
    const w = Math.max(0, Math.min(100, Math.round(weight)))
    setState((s) => ({
      ...s,
      criteria: s.criteria.map((c) => (c.id === id ? { ...c, weight: w } : c)),
    }))
  }, [])

  const removeCriterion = useCallback((id: string) => {
    setState((s) => {
      const scores = { ...s.scores }
      for (const o of s.options) {
        delete scores[scoreKey(o.id, id)]
      }
      return {
        ...s,
        criteria: s.criteria.filter((c) => c.id !== id),
        scores,
      }
    })
  }, [])

  const setScore = useCallback(
    (optionId: string, criterionId: string, score: number) => {
      const clamped = Math.min(
        state.scaleMax,
        Math.max(state.scaleMin, Math.round(score)),
      )
      setState((s) => ({
        ...s,
        scores: { ...s.scores, [scoreKey(optionId, criterionId)]: clamped },
      }))
    },
    [state.scaleMax, state.scaleMin],
  )

  const resetToDemo = useCallback(() => {
    clearState()
    setState(createDemoState())
    window.history.replaceState(null, '', window.location.pathname)
    showToast('Loaded sample decision')
  }, [showToast])

  const clearAll = useCallback(() => {
    clearState()
    setState({
      title: '',
      options: [],
      criteria: [],
      scores: {},
      scaleMin: 1,
      scaleMax: 5,
    })
    window.history.replaceState(null, '', window.location.pathname)
    showToast('Cleared matrix')
  }, [showToast])

  const copyShareLink = useCallback(async () => {
    const url = buildShareUrl(state)
    try {
      await navigator.clipboard.writeText(url)
      showToast('Share link copied')
    } catch {
      showToast('Could not copy link')
    }
  }, [state, showToast])

  const copyMarkdown = useCallback(async () => {
    const md = toMarkdown(state, compute)
    try {
      await navigator.clipboard.writeText(md)
      showToast('Summary copied as markdown')
    } catch {
      showToast('Could not copy summary')
    }
  }, [state, compute, showToast])

  const downloadCsvExport = useCallback(() => {
    downloadFile(
      'decision-matrix.csv',
      toCsv(state),
      'text/csv;charset=utf-8',
    )
    showToast('Downloaded CSV')
  }, [state, showToast])

  const downloadJsonExport = useCallback(() => {
    downloadFile(
      'decision-matrix.json',
      toJson(state),
      'application/json;charset=utf-8',
    )
    showToast('Downloaded JSON')
  }, [state, showToast])

  const importJson = useCallback((json: string): boolean => {
    try {
      const data = JSON.parse(json) as MatrixState
      if (!Array.isArray(data.options) || !Array.isArray(data.criteria)) {
        return false
      }
      setState({
        title: data.title ?? '',
        options: data.options,
        criteria: data.criteria,
        scores: data.scores ?? {},
        scaleMin: data.scaleMin ?? 1,
        scaleMax: data.scaleMax ?? 5,
      })
      window.history.replaceState(null, '', window.location.pathname)
      showToast('Imported matrix')
      return true
    } catch {
      return false
    }
  }, [showToast])

  const dismissToast = useCallback(() => setToast(null), [])

  return {
    state,
    compute,
    sharedFromUrl,
    toast,
    setTitle,
    addOption,
    renameOption,
    removeOption,
    addCriterion,
    renameCriterion,
    setCriterionWeight,
    removeCriterion,
    setScore,
    resetToDemo,
    clearAll,
    copyShareLink,
    copyMarkdown,
    downloadCsv: downloadCsvExport,
    downloadJson: downloadJsonExport,
    importJson,
    dismissToast,
  }
}
