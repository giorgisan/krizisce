// lib/adFilter.ts
// Hiter, lokalni filter za sponzorirane/oglasne članke.
// Ne spreminja objektov; samo izračuna točke in omogoča filtriranje.

// --- Konfiguracija pravil ---

// Ključne besede (SI/EN)
const KEYWORDS = [
  // slovensko
  'oglasno sporočilo',
  'promocijsko sporočilo',
  'plačana objava',
  'sponzorirano',
  'oglasni prispevek',
  'komercialno sporočilo',
  'oglasna vsebina',
  'v sodelovanju z',
  'partner vsebina',
  'sporočilo za javnost',
  'pr prispevek',
  // angleško
  'sponsored',
  'sponsored content',
  'advertorial',
  'paid post',
  'promotion',
  'partner content',
  'press release'
]

// Močni “shorthand” tokeni
const STRONG_TOKENS = [
  'promo', 'oglas', 'advertorial', 'ad:', '[ad]', 'pr:', '[pr]', 'sponzorirano'
]

// Šibkejši “sales” izrazi (manj točk)
const WEAK = [
  'akcija', 'popust', 'kupon', 'super cena', 'kupite', 'naročite', 'prihrani', 'ponudba'
]

// Vzorci v URL-jih
const URL_PATTERNS = [
  /\/oglas/i,
  /\/oglasi/i,
  /\/promo/i,
  /\/promocij/i,
  /\/sponzor/i,
  /\/advert/i,
  /[?&]utm_campaign=promo/i
]

// Avtorji, ki pogosto označujejo PR
const AUTHOR_PATTERNS = [/^\s*pr\s*$/i, /marketing/i, /komunikacije/i, /uredništvo pr/i]

// Heuristike
const UPPERCASE_SHOUT_RATIO = 0.6
const SHORT_TITLE_MAX = 5

// Teže
const W = {
  KEYWORD: 2,
  STRONG: 3,
  URL: 2,
  AUTHOR: 2,
  WEAK: 1,
  SHOUT: 1,
  SHORT: 1,
  CATEGORY: 2
}

function normalize(s?: string | null): string {
  if (!s) return ''
  return s
    .toLowerCase()
    .normalize('NFD')
    // @ts-ignore: regexp property exists in modern runtimes
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

function uppercaseRatio(s: string): number {
  const letters = s.replace(/[^A-Za-zČŠŽĆĐÀ-ÿ]/g, '')
  if (!letters.length) return 0
  const upp = letters.replace(/[^A-ZČŠŽĆĐ]/g, '')
  return upp.length / letters.length
}

// Vzemi kategorije, če obstajajo, kot nize (nekateri feedi imajo array ali string)
function toCategories(x: any): string[] {
  if (!x) return []
  if (Array.isArray(x)) return x.map((v) => String(v))
  if (typeof x === 'string') return [x]
  return []
}

export function scoreAd(item: any) {
  const matches: string[] = []
  let score = 0

  const title = normalize(item?.title || '')
  const desc = normalize(item?.description || item?.contentSnippet || '')
  const html = normalize(item?.content || item?.['content:encoded'] || '')
  const url = String(item?.link || '')
  const author = normalize(item?.author || '')
  const categories = toCategories(item?.categories).map(normalize)

  const hay = `${title}\n${desc}\n${html}`

  for (const k of KEYWORDS) {
    if (hay.includes(normalize(k))) {
      score += W.KEYWORD
      matches.push(`kw:${k}`)
    }
  }

  for (const t of STRONG_TOKENS) {
    if (title.includes(normalize(t)) || desc.includes(normalize(t))) {
      score += W.STRONG
      matches.push(`strong:${t}`)
    }
  }

  for (const w of WEAK) {
    if (hay.includes(normalize(w))) {
      score += W.WEAK
      matches.push(`weak:${w}`)
    }
  }

  for (const rx of URL_PATTERNS) {
    if (rx.test(url)) {
      score += W.URL
      matches.push(`url:${rx.source}`)
    }
  }

  for (const rx of AUTHOR_PATTERNS) {
    if (rx.test(author)) {
      score += W.AUTHOR
      matches.push(`author:${rx.source}`)
    }
  }

  if (categories.some(c =>
    c.includes('sponzor') || c.includes('promo') || c.includes('oglas') || c.includes('sponsored')
  )) {
    score += W.CATEGORY
    matches.push('category:sponsored')
  }

  const words = title.split(/\s+/).filter(Boolean)
  if (uppercaseRatio(item?.title || '') > UPPERCASE_SHOUT_RATIO) {
    score += W.SHOUT
    matches.push('shout:title_uppercase')
  }
  if (words.length <= SHORT_TITLE_MAX && STRONG_TOKENS.some(t => title.includes(normalize(t)))) {
    score += W.SHORT
    matches.push('short+strong')
  }

  return { score, matches }
}

/**
 * Hitri check, ali je članek najverjetneje oglas.
 * @param item objekt RSS/NewsItem
 * @param opts.threshold privzeto 3 (višje = strožje)
 */
export function isLikelyAd(item: any, opts?: { threshold?: number }) {
  const threshold = opts?.threshold ?? 3
  const { score, matches } = scoreAd(item)
  return { isAd: score >= threshold, score, matches }
}

/**
 * Vrne array brez oglasov (ne mutira elementov).
 */
export function excludeAds<T>(items: T[], threshold = 3): T[] {
  return items.filter((it: any) => !isLikelyAd(it, { threshold }).isAd)
}
