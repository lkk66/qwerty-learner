import type { LivePracticeStats, NCEUnit, SentenceResult, UnitPracticeResult } from '../types'
import { useCallback, useMemo, useState } from 'react'

const EMPTY_LIVE: LivePracticeStats = {
  unitId: null,
  elapsedMs: 0,
  keystrokes: 0,
  wrongKeystrokes: 0,
  errors: 0,
}

export interface LessonTotals {
  completed: number
  skipped: number
  keystrokes: number
  correctKeystrokes: number
  wrongKeystrokes: number
  elapsedMs: number
  cpm: number
  accuracy: number
  errors: number
}

/** Per-lesson aggregates; the live sentence is merged in so the speed bar updates while typing. */
export function useLessonSession() {
  const [results, setResults] = useState<Record<string, UnitPracticeResult>>({})
  const [skipped, setSkipped] = useState<string[]>([])
  const [live, setLive] = useState<LivePracticeStats>(EMPTY_LIVE)

  const reset = useCallback(() => {
    setResults({})
    setSkipped([])
    setLive(EMPTY_LIVE)
  }, [])

  const resetLive = useCallback(() => setLive(EMPTY_LIVE), [])

  const recordResult = useCallback((unit: NCEUnit, result: SentenceResult) => {
    setResults((previous) => ({
      ...previous,
      [unit.id]: {
        unitId: unit.id,
        practiceText: unit.practiceText,
        ...result,
      },
    }))
    setSkipped((previous) => previous.filter((id) => id !== unit.id))
    setLive(EMPTY_LIVE)
  }, [])

  const recordSkip = useCallback((unit: NCEUnit) => {
    setSkipped((previous) => (previous.includes(unit.id) ? previous : [...previous, unit.id]))
  }, [])

  const updateLive = useCallback((stats: LivePracticeStats) => setLive(stats), [])

  const totals = useMemo<LessonTotals>(() => {
    const base = Object.values(results).filter((result) => result.unitId !== live.unitId)
    const source = live.unitId ? [...base, live] : base

    let keystrokes = 0
    let wrongKeystrokes = 0
    let elapsedMs = 0
    let errors = 0
    source.forEach((item) => {
      keystrokes += item.keystrokes
      wrongKeystrokes += item.wrongKeystrokes
      elapsedMs += item.elapsedMs
      errors += item.errors
    })

    const correctKeystrokes = Math.max(0, keystrokes - wrongKeystrokes)
    return {
      completed: Object.keys(results).length,
      skipped: skipped.length,
      keystrokes,
      correctKeystrokes,
      wrongKeystrokes,
      elapsedMs,
      cpm: elapsedMs > 0 ? Math.round(keystrokes / (elapsedMs / 60000)) : 0,
      accuracy: keystrokes > 0 ? Math.round((correctKeystrokes / keystrokes) * 100) : 0,
      errors,
    }
  }, [results, skipped, live])

  const wrongResults = useMemo(() => Object.values(results).filter((result) => result.errors > 0), [results])

  return { results, skipped, totals, wrongResults, recordResult, recordSkip, updateLive, resetLive, reset }
}
