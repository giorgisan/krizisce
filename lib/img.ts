// lib/img.ts
/** Če je absolutni URL, vrne domeno brez protokola (za images.weserv.nl); relativne poti vrnemo takšne kot so. */
function stripProtocol(u: string) {
  try {
    const url = new URL(u);
    return url.host + url.pathname + url.search;
  } catch {
    // verjetno relativna pot (/logos/..), vrni kot je
    return u;
  }
}

/** Vrni proxied URL preko images.weserv.nl z željeno širino/višino.
 *
 *  Parametra `il=1` (interlaced) in `q=75` (kakovost) zmanjšata velikost slik,
 *  `we=1` prepreči nepotrebno povečavo, `af=1` pa poskrbi za nekaj ostrine.
 */
export function proxiedImage(url: string, w: number, h?: number, dpr = 1) {
  // relativne slike (npr. /logos/...) ne proxiamo
  if (url.startsWith('/')) return url;
  const clean = stripProtocol(url);
  const wp = Math.round(w * dpr);
  const hp = h ? Math.round(h * dpr) : undefined;

  const params = new URLSearchParams({
    url: clean,
    w: String(wp),
    fit: 'cover',
    dpr: String(Math.max(1, Math.min(3, Math.round(dpr)))),
  });
  if (hp) params.set('h', String(hp));
  params.set('we', '1');        // brez povečave
  params.set('af', '1');        // adaptive filter (ostrina)
  params.set('il', '1');        // progressive/interlaced
  params.set('q', '75');        // kakovost (manjša = manjši prenos)

  return `https://images.weserv.nl/?${params.toString()}`;
}

/** Zgradi srcset za podane širine in razmerje stranic. */
export function buildSrcSet(url: string, widths: number[], aspect: number) {
  const hFromW = (w: number) => Math.round(w / aspect);
  return widths.map((w) => `${proxiedImage(url, w, hFromW(w))} ${w}w`).join(', ');
}
