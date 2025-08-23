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

/** Vrni proxied URL preko images.weserv.nl z željeno širino/višino. */
export function proxiedImage(url: string, w: number, h?: number, dpr = 1) {
  // relativne slike (npr. /logos/...) ne proxiamo
  if (url.startsWith('/')) return url;
  const clean = stripProtocol(url);
  const wp = Math.round(w * dpr);
  const hp = h ? Math.round(h * dpr) : undefined;

  // Fit: cover, format: WebP tam kjer je podprt (we=1), interlace=on (il), dpr
  // images.weserv.nl sprejme ?url=<host/path>&w=&h=&fit=cover&dpr=
  const params = new URLSearchParams({
    url: clean,
    w: String(wp),
    fit: 'cover',
    dpr: String(Math.max(1, Math.min(3, Math.round(dpr)))),
  });
  if (hp) params.set('h', String(hp));
  // poskusno webp, če ga brskalnik sprejme (we) – če parameter ni podprt, ga servis ignorira
  params.set('we', '1');
  // malo “nativne” ostrine/opt (odvisno od servisa; ignorirano, če ne obstaja)
  params.set('af', '1');

  return `https://images.weserv.nl/?${params.toString()}`;
}

/** Zgradi srcset za tipične širine kartic. */
export function buildSrcSet(url: string, widths: number[], aspect: number) {
  const hFromW = (w: number) => Math.round(w / aspect);
  return widths.map((w) => `${proxiedImage(url, w, hFromW(w))} ${w}w`).join(', ');
}
