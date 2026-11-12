import type { NCELesson } from '../types'
import { fetchAsset } from '../utils/resolveAsset'
import { useEffect, useState } from 'react'

export function useNCELesson(path: string | null) {
  const [lesson, setLesson] = useState<NCELesson | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!path) {
      setLesson(null)
      setError(null)
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)
    fetchAsset<NCELesson>(path)
      .then((data) => {
        if (cancelled) return
        if (data.schemaVersion !== 1 || !Array.isArray(data.units)) {
          throw new Error('课文数据版本不受支持，请重新生成 NCE 数据')
        }
        setLesson(data)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [path])

  return { lesson, error, isLoading }
}
