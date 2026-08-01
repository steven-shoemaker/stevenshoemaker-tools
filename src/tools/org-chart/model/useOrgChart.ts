import { useCallback, useEffect, useMemo, useState } from 'react'
import { parseOrgCsv, toCsv } from './csv'
import { computeStats, getDirects } from './graph'
import {
  addPerson,
  applyDirectPlacements,
  makeRoot,
  movePerson,
  removePerson,
  restorePerson,
} from './operations'
import { clearState, loadState, saveState } from './storage'
import type {
  ChartSnapshot,
  DialogState,
  DirectPlacement,
  ImportRepair,
  SpocStats,
} from './types'

type Screen = 'import' | 'sandbox'

const MAX_HISTORY = 80

function pushHistory(
  past: ChartSnapshot[],
  current: ChartSnapshot,
): ChartSnapshot[] {
  return [...past, current].slice(-MAX_HISTORY)
}

export function useOrgChart() {
  const restored = useMemo(() => loadState(), [])
  const [screen, setScreen] = useState<Screen>(
    restored ? 'sandbox' : 'import',
  )
  const [csvText, setCsvText] = useState('')
  const [importSnapshot, setImportSnapshot] = useState<ChartSnapshot | null>(
    restored?.importSnapshot ?? null,
  )
  const [working, setWorking] = useState<ChartSnapshot | null>(
    restored?.working ?? null,
  )
  const [past, setPast] = useState<ChartSnapshot[]>(restored?.past ?? [])
  const [future, setFuture] = useState<ChartSnapshot[]>(restored?.future ?? [])
  const [repairs, setRepairs] = useState<ImportRepair[]>([])
  const [previewStats, setPreviewStats] = useState<SpocStats | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' })
  const [savedFlash, setSavedFlash] = useState(true)
  const [baselineStats, setBaselineStats] = useState<SpocStats | null>(
    restored ? computeStats(restored.importSnapshot.people) : null,
  )
  const [error, setError] = useState<string | null>(null)
  const [justMovedId, setJustMovedId] = useState<string | null>(null)

  const stats = useMemo(
    () => (working ? computeStats(working.people) : null),
    [working],
  )

  useEffect(() => {
    if (!importSnapshot || !working) return
    saveState({ importSnapshot, working, past, future })
    setSavedFlash(true)
    const t = window.setTimeout(() => setSavedFlash(true), 0)
    return () => window.clearTimeout(t)
  }, [importSnapshot, working, past, future])

  useEffect(() => {
    if (!justMovedId) return
    const t = window.setTimeout(() => setJustMovedId(null), 650)
    return () => window.clearTimeout(t)
  }, [justMovedId])

  const commit = useCallback((next: ChartSnapshot) => {
    setWorking((current) => {
      if (!current) return next
      setPast((p) => pushHistory(p, current))
      setFuture([])
      return next
    })
    setError(null)
  }, [])

  const buildFromCsv = useCallback((text: string) => {
    const result = parseOrgCsv(text)
    if (result.snapshot.people.length === 0) {
      setError('No people found in CSV')
      setPreviewStats(null)
      setRepairs(result.repairs)
      return
    }
    setCsvText(text)
    setImportSnapshot(result.snapshot)
    setWorking(result.snapshot)
    setPast([])
    setFuture([])
    setRepairs(result.repairs)
    setPreviewStats(result.stats)
    setBaselineStats(result.stats)
    setSelectedId(null)
    setError(null)
  }, [])

  const openSandbox = useCallback(() => {
    if (!working) return
    setScreen('sandbox')
  }, [working])

  const backToImport = useCallback(() => {
    setScreen('import')
    setDialog({ type: 'none' })
  }, [])

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0 || !working) return p
      const previous = p[p.length - 1]
      setFuture((f) => [working, ...f])
      setWorking(previous)
      return p.slice(0, -1)
    })
  }, [working])

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0 || !working) return f
      const [next, ...rest] = f
      setPast((p) => pushHistory(p, working))
      setWorking(next)
      return rest
    })
  }, [working])

  const reset = useCallback(() => {
    if (!importSnapshot) return
    setWorking(importSnapshot)
    setPast([])
    setFuture([])
    setSelectedId(null)
    setDialog({ type: 'none' })
  }, [importSnapshot])

  const downloadCsv = useCallback(() => {
    if (!working) return
    const blob = new Blob([toCsv(working.people)], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'org-chart.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [working])

  const clearLocal = useCallback(() => {
    clearState()
    setImportSnapshot(null)
    setWorking(null)
    setPast([])
    setFuture([])
    setRepairs([])
    setPreviewStats(null)
    setBaselineStats(null)
    setSelectedId(null)
    setScreen('import')
    setCsvText('')
  }, [])

  const runMove = useCallback(
    (personId: string, managerId: string | null) => {
      if (!working) return
      try {
        commit(movePerson(working, personId, managerId))
        setJustMovedId(personId)
        setDialog({ type: 'none' })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Move failed')
      }
    },
    [working, commit],
  )

  const runMakeRoot = useCallback(
    (personId: string) => {
      if (!working) return
      try {
        commit(makeRoot(working, personId))
        setJustMovedId(personId)
        setDialog({ type: 'none' })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Make root failed')
      }
    },
    [working, commit],
  )

  const runCollect = useCallback(
    (
      personId: string,
      placements: Record<string, DirectPlacement>,
      thenRemove: boolean,
    ) => {
      if (!working) return
      let next = applyDirectPlacements(working, personId, placements)
      if (thenRemove) next = removePerson(next, personId)
      commit(next)
      if (thenRemove && selectedId === personId) setSelectedId(null)
      setDialog({ type: 'none' })
    },
    [working, commit, selectedId],
  )

  const runRemove = useCallback(
    (personId: string) => {
      if (!working) return
      const directs = getDirects(working.people, personId)
      if (directs.length > 0) {
        setDialog({ type: 'collect', personId, thenRemove: true })
        return
      }
      commit(removePerson(working, personId))
      if (selectedId === personId) setSelectedId(null)
      setDialog({ type: 'none' })
    },
    [working, commit, selectedId],
  )

  const runRestore = useCallback(
    (personId: string, managerId: string | null) => {
      if (!working) return
      commit(restorePerson(working, personId, managerId))
      setDialog({ type: 'none' })
    },
    [working, commit],
  )

  const runAdd = useCallback(
    (name: string, managerId: string | null | 'unassigned') => {
      if (!working) return
      try {
        if (managerId === 'unassigned') {
          commit(addPerson(working, name, null, true))
        } else {
          commit(addPerson(working, name, managerId, false))
        }
        setDialog({ type: 'none' })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Add failed')
      }
    },
    [working, commit],
  )

  return {
    screen,
    csvText,
    setCsvText,
    importSnapshot,
    working,
    repairs,
    previewStats,
    baselineStats,
    stats,
    selectedId,
    setSelectedId,
    justMovedId,
    dialog,
    setDialog,
    savedFlash,
    error,
    setError,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    buildFromCsv,
    openSandbox,
    backToImport,
    undo,
    redo,
    reset,
    downloadCsv,
    clearLocal,
    runMove,
    runMakeRoot,
    runCollect,
    runRemove,
    runRestore,
    runAdd,
  }
}

export type OrgChartApi = ReturnType<typeof useOrgChart>
