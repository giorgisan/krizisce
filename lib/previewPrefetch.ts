// lib/previewPrefetch.ts

type Payload =
  | { error: string }
  | { title: string; site: string; image?: string | null; html: string; url: string }

const TTL = 1000 * 60 * 5;     // 5 min
const INFLIGHT_MAX = 3;        // največ hkratnih prefetchov
const LRU_LIMIT = 200;         // zgornja meja velikosti cache-a

type Entry = { ts: number; promise: Promise<Payload>; value?: Payload }
const store = new Map<string, Entry>()
let inflightCount = 0

/** Ali je omrežje OK za prefetch (brez “save-data”, ne 2G, tab viden) */
export function canPrefetch(): boolean {
  try {
    if (typeof document !== 'undefined' && document.hidden) return false
    const conn = (navigator as any)?.connection
    if (!conn) return true
    const et = String(conn.effectiveType || '').toLowerCase()
    if (conn.saveData) return false
    if (et.includes('2g') || et.includes('slow-2g')) return false
    if (typeof conn.downlink === 'number' && conn.downlink < 1) return false
    return true
  } catch {
    return true
  }
}

/** LRU prirezovanje – združljivo z ES2015 (brez spread iteracije). */
function trimLRU() {
  if (store.size <= LRU_LIMIT) return
  const toDrop = store.size - LRU_LIMIT
  const keys = Array.from(store.keys())
  for (let i = 0; i < toDrop; i++) store.delete(keys[i])
}

/** Prefetch /api/preview (de-dupe + TTL + cap). Nikoli ne “pokvari” UI-ja. */
export function preloadPreview(articleUrl: string): Promise<Payload> {
  const key = articleUrl
  const now = Date.now()

  // Svež cache? Uporabi obstoječ promise
  const cached = store.get(key)
  if (cached && now - cached.ts < TTL) return cached.promise

  // Preveč hkratnih? Vrni obstoječega ali noop promise
  if (inflightCount >= INFLIGHT_MAX) {
    if (cached) return cached.promise
    return Promise.resolve({ error: 'prefetch-skipped' } as any)
  }

  inflightCount++

  const p = (async (): Promise<Payload> => {
    try {
      const res = await fetch(`/api/preview?url=${encodeURIComponent(articleUrl)}`)
      // Če server vrne 4xx/5xx, ne zapisuj v cache kot “value”
      const data = (await res.json()) as Payload
      const e = store.get(key)
      if (e && !('error' in data)) e.value = data
      return data
    } catch {
      // Prefetch je “best-effort”: ne zapišemo napake v cache,
      // odpiranje modala naj še vedno pokliče /api/preview normalno.
      return { error: 'prefetch-failed' }
    } finally {
      inflightCount = Math.max(0, inflightCount - 1)
    }
  })()

  store.set(key, { ts: now, promise: p })
  trimLRU()
  return p
}

/** Če je v cache-u in še sveže, vrne resolved value; sicer null. */
export function peekPreview(articleUrl: string): Payload | null {
  const e = store.get(articleUrl)
  if (!e) return null
  if (Date.now() - e.ts > TTL) return null
  return e.value ?? null
}
