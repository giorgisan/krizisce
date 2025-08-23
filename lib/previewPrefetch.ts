// lib/previewPrefetch.ts

type Payload =
  | { error: string }
  | { title: string; site: string; image?: string | null; html: string; url: string }

const TTL = 1000 * 60 * 5 // 5 min
type Entry = { ts: number; promise: Promise<Payload>; value?: Payload }
const store = new Map<string, Entry>()

/** Prefetch /api/preview za dani URL in ga shrani v globalni cache (de-dupe). */
export function preloadPreview(articleUrl: string): Promise<Payload> {
  const key = articleUrl
  const now = Date.now()
  const cached = store.get(key)
  if (cached && now - cached.ts < TTL) return cached.promise

  const p = fetch(`/api/preview?url=${encodeURIComponent(articleUrl)}`)
    .then((r) => r.json() as Promise<Payload>)
    .then((data) => {
      const e = store.get(key)
      if (e) e.value = data
      return data
    })
    .catch((err) => {
      // ne ubij cache-a zaradi enkratne napake
      throw err
    })

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
