// lib/previewPrefetch.ts

type Payload =
  | { error: string }
  | { title: string; site: string; image?: string | null; html: string; url: string }

const TTL = 1000 * 60 * 5;         // 5 minut
const INFLIGHT_MAX = 3;            // max paralelnih prefetchov
const LRU_LIMIT = 200;             // koliko entryjev držimo v cache-u

type Entry = {
  ts: number
  promise: Promise<Payload>
  value?: Payload
  controller?: AbortController
}

const store = new Map<string, Entry>()
let inflightCount = 0

/** Ali je omrežje OK za prefetch (brez “save-data”, ne 2G, tab viden) */
export function canPrefetch(): boolean {
  try {
    if (typeof document !== 'undefined' && document.hidden) return false
    const conn = (navigator as any)?.connection
    if (!conn) return true
    const et = String(conn.effectiveType || '').toLowerCase()
    const save = !!conn.saveData
    if (save) return false
    if (et.includes('2g') || et.includes('slow-2g')) return false
    if (typeof conn.downlink === 'number' && conn.downlink < 1) return false
    return true
  } catch {
    return true
  }
}

/** Preseka cache na LRU_LIMIT (združljivo z ES2015 brez downlevelIteration). */
function trimLRU() {
  if (store.size <= LRU_LIMIT) return
  const toDrop = store.size - LRU_LIMIT
  const keys = Array.from(store.keys()) // <-- fix za build
  for (let i = 0; i < toDrop; i++) store.delete(keys[i])
}

/** Prefetch /api/preview za dani URL in shrani v globalni cache (de-dupe + TTL + cap). */
export function preloadPreview(articleUrl: string): Promise<Payload> {
  const key = articleUrl
  const now = Date.now()

  // svež cache
  const cached = store.get(key)
  if (cached && now - cached.ts < TTL) return cached.promise

  // preveč hkratnih? vrni prejšnje ali noop
  if (inflightCount >= INFLIGHT_MAX) {
    if (cached) return cached.promise
    return Promise.resolve({ error: 'prefetch-skipped' } as any)
  }

  // pripravi abort
  const controller = new AbortController()
  inflightCount++

  const p = fetch(`/api/preview?url=${encodeURIComponent(articleUrl)}`, { signal: controller.signal })
    .then((r) => r.json() as Promise<Payload>)
    .then((data) => {
      const e = store.get(key)
      if (e) e.value = data
      return data
    })
    .catch((err) => {
      // če je bil abort, vrni “ok” napako, da ne truplamo konzole
      if (err && String(err.name) === 'AbortError') {
        return { error: 'prefetch-aborted' } as Payload
      }
      return { error: 'prefetch-failed' } as Payload
    })
    .finally(() => {
      inflightCount = Math.max(0, inflightCount - 1)
    })

  store.set(key, { ts: now, promise: p, controller })
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

/** Poskusi prekiniti prefetch (če še teče) in odstrani star/neenoten entry. */
export function cancelPreview(articleUrl: string): void {
  const e = store.get(articleUrl)
  if (!e) return
  try { e.controller?.abort() } catch {}
  // ne brišemo nujno iz store-a (lahko ostane value); če je bil samo inflight, ostane s errorjem
}

/** preprosta debounce util (neodvisna od lodash), stabilna referenca priporočljiva v useMemo */
export function debouncePrefetch(fn: (url: string) => void, wait = 120) {
  let t: number | null = null
  return (url: string) => {
    if (t) window.clearTimeout(t)
    t = window.setTimeout(() => { t = null; fn(url) }, wait)
  }
}
