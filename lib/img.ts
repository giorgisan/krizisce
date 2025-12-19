// lib/img.ts

/** Preveri, ali gre za images.weserv.nl / wsrv.nl URL */
function isWeserv(u: string): boolean {
  try {
    const { hostname } = new URL(u)
    return hostname.endsWith('images.weserv.nl') || hostname === 'wsrv.nl'
  } catch {
    return false
  }
}

/**
 * Vrni proxied URL preko images.weserv.nl z željeno širino/višino.
 */
export function proxiedImage(url: string, w: number, h?: number, dpr = 1) {
  // Relativne slike (npr. /logos/...) pustimo pri miru
  if (!url || url.startsWith('/')) return url

  const wp = Math.round(w * dpr)
  const hp = h ? Math.round(h * dpr) : undefined
  const dprClamped = Math.max(1, Math.min(3, Math.round(dpr)))

  // Če je URL že Weserv, samo posodobimo parametre
  if (isWeserv(url)) {
    try {
      const u = new URL(url)
      const p = u.searchParams
      p.set('w', String(wp))
      if (hp) p.set('h', String(hp)); else p.delete('h')
      p.set('dpr', String(dprClamped))
      
      // Standardni parametri za optimizacijo
      p.set('we', '1') // Ne povečuj, če je original manjši
      p.set('il', '1') // Progressive loading
      p.set('q', '65') // Kvaliteta 65% (odlično razmerje)
      p.set('output', 'webp')
      p.set('n', '-1') // Fix za orientacijo in velike slike
      
      u.search = p.toString()
      return u.toString()
    } catch {
      return url
    }
  }

  // Ustvarimo nov proxy URL
  const params = new URLSearchParams({
    url, // Weserv sprejme poln URL
    w: String(wp),
    fit: 'cover',
    dpr: String(dprClamped),
    we: '1',
    af: '1', // Adaptive filter (malo izostri pomanjšane slike)
    il: '1',
    q: '65',
    output: 'webp',
    n: '-1', // Fix za orientacijo in napake
  })

  if (hp) params.set('h', String(hp))

  return `https://images.weserv.nl/?${params.toString()}`
}

/** Zgradi srcset za podane širine in razmerje stranic. */
export function buildSrcSet(url: string, widths: number[], aspect: number) {
  const hFromW = (w: number) => Math.round(w / aspect)
  return widths.map((w) => `${proxiedImage(url, w, hFromW(w))} ${w}w`).join(', ')
}
