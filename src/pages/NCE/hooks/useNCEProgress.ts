import { clearProgress, loadProgress, saveProgress } from '../db'
import type { PracticeMode } from '../types'
import { restorePosition } from '../utils/progress'
import { resolveAsset } from '../utils/resolveAsset'
import { useCallback, useEffect, useState } from 'react'

/**
 * Progress is keyed by the stable Unit ID. Skipping or blocking a Unit never
 * changes the ID of a later Unit, so stored positions stay valid.
 */
export function useNCEProgress(lessonId: string | null, mode: PracticeMode, unitIds: string[], allUnitIds: string[]) {
  const [index, setIndex] = useState(0)
  const [restored, setRestored] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setIndex(0)
    setRestored(false)
    setNotice(null)
    if (!lessonId) {
      setRestored(true)
      return
    }
    let cancelled = false
    loadProgress(lessonId, mode)
      .then(async (record) => {
        if (cancelled) return
        if (record) {
          let targets: string[] = []
          if (!unitIds.includes(record.unitId)) {
            try {
              const response = await fetch(resolveAsset('nce/review/id-map.json'))
              if (response.ok) {
                const data = await response.json()
                const mapping = data.mappings?.find(
                  (entry: { lessonId: string; fromUnitId: string }) => entry.lessonId === lessonId && entry.fromUnitId === record.unitId,
                )
                targets = mapping?.toUnitIds ?? (mapping?.toUnitId ? [mapping.toUnitId] : [])
              }
            } catch {
              // Legacy releases do not necessarily contain a migration map.
            }
          }
          if (cancelled) return
          if (unitIds.length > 0 && !unitIds.includes(record.unitId) && !targets.some((id) => unitIds.includes(id))) {
            const hasAnchor = [record.unitId, ...targets].some((id) => allUnitIds.includes(id))
            setNotice(
              hasAnchor ? '原进度所在句暂不可练习，已定位到附近的可练习句子。' : '原进度无法匹配到当前句子，已按历史位置恢复，请核对。',
            )
          }
          setIndex(restorePosition(record, unitIds, targets, allUnitIds))
        }
        setRestored(true)
      })
      .catch(() => {
        if (!cancelled) setRestored(true)
      })
    return () => {
      cancelled = true
    }
  }, [lessonId, mode, unitIds, allUnitIds])

  const persist = useCallback(
    async (nextIndex: number, unitId: string, completed = false) => {
      if (!lessonId) return
      try {
        await saveProgress({ lessonId, mode, unitId, sentenceIndex: nextIndex, completed, updatedAt: Date.now() })
      } catch {
        // IndexedDB may be unavailable in some embedded contexts; typing must still work.
      }
    },
    [lessonId, mode],
  )

  const reset = useCallback(async () => {
    setIndex(0)
    setNotice(null)
    if (lessonId) {
      try {
        await clearProgress(lessonId, mode)
      } catch {
        // ignore
      }
    }
  }, [lessonId, mode])

  return { index, setIndex, restored, notice, persist, reset }
}
