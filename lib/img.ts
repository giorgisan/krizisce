/** Preveri, ali gre za images.weserv.nl / wsrv.nl URL */
function isWeserv(u: string): boolean {
  try {
    const { hostname } = new URL(u)
    return hostname.endsWith('images.weserv.nl') || hostname === 'wsrv.nl'
  } catch {
    return false
  }
}

/** Če je absolutni URL, vrne domeno brez protokola (legacy helper). */
function stripProtocol(u: string) {
  try {
    const url = new URL(u)
    return url.host + url.pathname + url.search
  } catch {
    return u
  }
}

/**
 * Vrni proxied URL preko images.weserv.nl z željeno širino/višino.
 *
 * Parametri:
 * - `il=1` (interlaced/progressive) izboljša percepcijo nalaganja,
 * - `q=65` zniža kakovost JPEG/WebP na 65 % (manj KB),
 * - `output=webp` pretvori izhod v WebP format,
 * - `we=1` prepreči nepotrebno povečavo,
 * - `af=1` adaptivni filter za ostrejšo sliko pri stiskanju PNG.
 *
 * Opomba: če dobimo že proxy-jan URL (weserv), samo posodobimo parametre,
 * NE ustvarjamo “proxy v proxy” (double-proxy).
 */
export function proxiedImage(url: string, w: number, h?: number, dpr = 1) {
  // relativne slike (npr. /logos/...) ne proxiamo
  if (url.startsWith('/')) return url

  const wp = Math.round(w * dpr)
  const hp = h ? Math.round(h * dpr) : undefined
  const dprClamped = Math.max(1, Math.min(3, Math.round(dpr)))

  if (isWeserv(url)) {
    // URL je že na weserv – le posodobimo parametre
    const u = new URL(url)
    const p = u.searchParams
    p.set('w', String(wp))
    if (hp) p.set('h', String(hp)); else p.delete('h')
    p.set('dpr', String(dprClamped))
    p.set('we', '1')
    p.set('af', '1')
    p.set('il', '1')
    p.set('q', '65')
    p.set('output', 'webp')
    u.search = p.toString()
    return u.toString()
  }

  // Novi proxy – ohranimo PROTOKOL (https/http), ne stripamo na silo.
  // images.weserv.nl podpira tudi polne absolute (url=https://...)
  const params = new URLSearchParams({
    url, // poln absolute URL – naj ostane, ker včasih http->https preklop ni trivialen
    w: String(wp),
    fit: 'cover',
    dpr: String(dprClamped),
    we: '1',
    af: '1',
    il: '1',
    q: '65',
    output: 'webp',
  })
  if (hp) params.set('h', String(hp))

  return `https://images.weserv.nl/?${params.toString()}`
}

/** Zgradi srcset za podane širine in razmerje stranic. */
export function buildSrcSet(url: string, widths: number[], aspect: number) {
  const hFromW = (w: number) => Math.round(w / aspect)
  return widths.map((w) => `${proxiedImage(url, w, hFromW(w))} ${w}w`).join(', ')
}
