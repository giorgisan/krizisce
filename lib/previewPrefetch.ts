// lib/previewPrefetch.ts

type Payload =
  | { error: string }
  | { title: string; site: string; image?: string | null; html: string; url: string }

const TTL_MS = 5 * 60 * 1000;          // 5 min
const INFLIGHT_MAX = 3;                // največ paralelnih zahtev
const LRU_LIMIT = 150;                 // največ vnosov v cache
const HOVER_DEBOUNCE_MS = 120;         // za zunanjega klica (opcijsko)
const RETRY_DELAY_MS = 350;            // majhen jitter za 1 retry

type Entry = {
  ts: number
  promise: Promise<Payload>
  value?: Payload
  ctrl: AbortController
  key: string
}

const store = new Map<string, Entry>()
let inflightCount = 0

/** Normaliziraj URL (odstrani UTM / fbclid, hash). */
function canonicalKey(href: string): string {
  try {
    const u = new URL(href)
    const keep = new URLSearchParams()
    u.searchParams.forEach((v, k) => {
      if (!/^utm_/i.test(k) && !/^(fbclid|gclid|mc_cid|mc_eid)$/i.test(k)) keep.set(k, v)
    })
    u.search = keep.toString()
    u.hash = ''
    return u.toString()
  } catch {
    return href
  }
}

/** Trdi omejevalnik velikosti cache-a (LRU eviction). */
function maybeEvictLRU() {
  if (store.size <= LRU_LIMIT) return
  // odstrani najstarejše zapise
  const toDrop = store.size - LRU_LIMIT
  const keys = [...store.keys()]
  for (let i = 0; i < toDrop; i++) store.delete(keys[i])
}

/** Ali je omrežje OK za prefetch (brez “save-data”, ne 2G, tab viden). */
export function canPrefetch(): boolean {
  try {
    if (typeof document !== 'undefined' && document.hidden) return false
    const conn = (navigator as any).connection
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

/** Opcijsko: preconnect do domene članka za hitrejši TCP/TLS handshake. */
function preconnectToOrigin(href: string) {
  try {
    const host = new URL(href).origin
    const sel = `link[data-preconnect="${host}"]`
    if (document.querySelector(sel)) return
    const l = document.createElement('link')
    l.rel = 'preconnect'
    l.href = host
    l.crossOrigin = 'anonymous'
    l.setAttribute('data-preconnect', host)
    document.head.appendChild(l)
  } catch {}
}

/** Prefetch /api/preview; de-dupe + TTL + cap + abort + 1x retry z jitterjem. */
export function preloadPreview(articleUrl: string): Promise<Payload> {
  const key = canonicalKey(articleUrl)
  const now = Date.now()
  const cached = store.get(key)

  if (cached && now - cached.ts < TTL_MS) return cached.promise
  if (inflightCount >= INFLIGHT_MAX) return cached ? cached.promise : Promise.resolve({ error: 'prefetch-skipped' } as any)

  preconnectToOrigin(articleUrl)

  const ctrl = new AbortController()
  inflightCount++

  const run = (retry = false): Promise<Payload> =>
    fetch(`/api/preview?url=${encodeURIComponent(articleUrl)}`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<Payload>)
      .catch(async (e) => {
        if (!retry && !ctrl.signal.aborted) {
          await new Promise((res) => setTimeout(res, RETRY_DELAY_MS + Math.random() * 150))
          return run(true)
        }
        return { error: String(e?.message || e) } as Payload
      })

  const promise = run().then((data) => {
    const e = store.get(key)
    if (e) e.value = data
    return data
  }).finally(() => {
    inflightCount = Math.max(0, inflightCount - 1)
  })

  store.set(key, { ts: now, promise, value: undefined, ctrl, key })
  maybeEvictLRU()
  return promise
}

/** Prekliči aktivni prefetch za URL (uporabi na mouseleave/blur). */
export function cancelPreview(articleUrl: string) {
  const key = canonicalKey(articleUrl)
  const e = store.get(key)
  if (e && e.ctrl) {
    try { e.ctrl.abort() } catch {}
  }
}

/** Če je v cache-u in še sveže, vrne resolved value; sicer null. */
export function peekPreview(articleUrl: string): Payload | null {
  const key = canonicalKey(articleUrl)
  const e = store.get(key)
  if (!e) return null
  if (Date.now() - e.ts > TTL_MS) return null
  return e.value ?? null
}

/** Enostaven debounce helper (neobvezen). */
export function debouncePrefetch(fn: (url: string) => void, ms = HOVER_DEBOUNCE_MS) {
  let t: any = null
  return (url: string) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(url), ms)
  }
}
