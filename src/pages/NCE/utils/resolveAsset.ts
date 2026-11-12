/**
 * Resolve NCE assets against the app base, not the current route path: under
 * BrowserRouter the page lives at /nce (or /typing/nce in the review build), so
 * page-relative resolution would request /nce/nce/index.json.
 */
const dataBase = import.meta.env.BASE_URL.startsWith('/') ? import.meta.env.BASE_URL : '/'

export function resolveAsset(path: string): string {
  const relative = path.replace(/^\/+/, '')
  const root = new URL(window.location.href).searchParams.get('nceDataRoot')
  // Only explicitly selected local batches can replace the existing data set.
  const prefix = root && /^nce-batches\/[a-zA-Z0-9-]+\/nce\/$/.test(root) ? root : null
  const target = prefix && relative.startsWith('nce/') ? prefix + relative.slice(4) : relative
  return new URL(target, new URL(dataBase, window.location.origin)).toString()
}

export async function fetchAsset<T>(path: string): Promise<T> {
  const response = await fetch(resolveAsset(path))
  if (!response.ok) {
    throw new Error(`无法加载资源 ${path}（HTTP ${response.status}）`)
  }
  return (await response.json()) as T
}
