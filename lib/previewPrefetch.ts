// lib/previewPrefetch.ts

type Payload =
  | { error: string }
  | { title: string; site: string; image?: string | null; html: string; url: string }

const TTL = 1000 * 60 * 5; // 5 min
const INFLIGHT_MAX = 3;

type Entry = { ts: number; promise: Promise<Payload>; value?: Payload }
const store = new Map<string, Entry>()
let inflightCount = 0

/** Ali je omrežje OK za prefetch (brez “save-data”, ne 2G, tab viden) */
export function canPrefetch(): boolean {
  try {
    // Ne prefetcha, če je tab skrit (nič koristi uporabniku)
    if (typeof document !== 'undefined' && document.hidden) return false

    const conn = (navigator as any).connection
    if (!conn) return true
    const et = String(conn.effectiveType || '').toLowerCase()
    const save = !!conn.saveData

    if (save) return false
    if (et.includes('2g') || et.includes('slow-2g')) return false
    // po želji: če je downlink < 1 Mbps, preskoči
    if (typeof conn.downlink === 'number' && conn.downlink < 1) return false

    return true
  } catch {
    return true
  }
}

/** Prefetch /api/preview za dani URL in shrani v globalni cache (de-dupe + TTL + cap). */
export function preloadPreview(articleUrl: string): Promise<Payload> {
  const key = articleUrl
  const now = Date.now()
  const cached = store.get(key)
  if (cached && now - cached.ts < TTL) return cached.promise

  // Če smo presegli globalni cap, ne začenjaj novega (ob kliku bo vseeno fetchano v komponenti)
  if (inflightCount >= INFLIGHT_MAX) {
    // vrni obstoječi promise, če ga imamo; sicer “no-op” resolved obljubo
    if (cached) return cached.promise
    return Promise.resolve({ error: 'prefetch-skipped' } as any)
  }

  inflightCount++
  const p = fetch(`/api/preview?url=${encodeURIComponent(articleUrl)}`)
    .then((r) => r.json() as Promise<Payload>)
    .then((data) => {
      const e = store.get(key)
      if (e) e.value = data
      return data
    })
    .finally(() => { inflightCount = Math.max(0, inflightCount - 1) })

  store.set(key, { ts: now, promise: p })
  return p
}

/** Če je v cache-u in še sveže, vrne resolved value; sicer null. */
export function peekPreview(articleUrl: string): Payload | null {
  const e = store.get(articleUrl)
  if (!e) return null
  if (Date.now() - e.ts > TTL) return null
  return e.value ?? null
}
