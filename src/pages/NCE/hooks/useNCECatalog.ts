import type { NCECatalog } from '../types'
import { fetchAsset } from '../utils/resolveAsset'
import { useEffect, useState } from 'react'

export function useNCECatalog() {
  const [catalog, setCatalog] = useState<NCECatalog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setError(null)
    fetchAsset<NCECatalog>('nce/index.json')
      .then((data) => {
        if (cancelled) return
        if (data.schemaVersion !== 1 || !Array.isArray(data.lessons)) {
          throw new Error('课程索引版本不受支持，请重新生成 NCE 数据')
        }
        setCatalog(data)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason))
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return { catalog, error, reload: () => setReloadKey((key) => key + 1) }
}
