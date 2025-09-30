// lib/adFilter.ts
// Hiter, lokalni filter "sponzorirano/oglas" vsebine za Križišče.
// Deluje na NewsItem (glej spodaj minimalni tip) in vrne "isAd", "adScore", "adMatches".
// Prag (threshold) je nastavljiv; priporočen 3.

export type NewsItem = {
  title: string
  description?: string | null
  contentHtml?: string | null
  link: string
  site?: string | null
  categories?: string[] | null
  author?: string | null
  publishedAt?: string | Date | null
  // polja, ki jih doda filter:
  isAd?: boolean
  adScore?: number
  adMatches?: string[]
}

// --- Konfiguracija pravil ---
// Ključne besede za SI/EN (naslov/opis/kategorije):
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
  'sporočilo za javnost', // po želji: lahko daš manj točk (vidi spodaj WEAK)
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

// Močne “shorthand” oznake (kričeče naslovi/oznaka):
const STRONG_TOKENS = [
  'promo', 'oglas', 'advertorial', 'ad:', '[ad]', 'pr:', '[pr]', 'sponzorirano'
]

// Šibkejše besede (manj točk):
const WEAK = [
  'akcija', 'popust', 'kupon', 'super cena', 'kupite', 'naročite', 'prihrani', 'ponudba'
]

// Vzorci URL/paths, ki pogosto nosijo promo:
const URL_PATTERNS = [
  /\/oglas/i,
  /\/oglasi/i,
  /\/promo/i,
  /\/promocij/i,
  /\/sponzor/i,
  /\/advert/i,
  /[?&]utm_campaign=promo/i
]

// Poimenske “avtor: PR/Marketing/Uredništvo” (nekateri mediji tako označijo):
const AUTHOR_PATTERNS = [/^\s*pr\s*$/i, /marketing/i, /komunikacije/i, /uredništvo pr/i]

// Dodatne heuristike
const UPPERCASE_SHOUT_RATIO = 0.6  // če je >60% velikih črk v naslovu, šteje kot “kričav” naslov
const SHORT_TITLE_MAX = 5          // zelo kratek naslov + strong token = verjetno oglas

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
    .replace(/\p{Diacritic}/gu, '') // odstrani šumnike, da "sporočilo" ~ "sporocilo"
    .trim()
}

function uppercaseRatio(s: string): number {
  const letters = s.replace(/[^A-Za-zČŠŽĆĐÀ-ÿ]/g, '')
  if (!letters.length) return 0
  const upp = letters.replace(/[^A-ZČŠŽĆĐ]/g, '')
  return upp.length / letters.length
}

export function scoreAd(item: NewsItem) {
  const matches: string[] = []
  let score = 0

  const title = normalize(item.title)
  const desc = normalize(item.description || '')
  const html = normalize(item.contentHtml || '')
  const url = item.link || ''
  const author = normalize(item.author || '')
  const categories = (item.categories || []).map(normalize)

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

  // Kategorije (nekateri RSS označijo "sponsored", "oglas")
  if (categories.some(c =>
    c.includes('sponzor') || c.includes('promo') || c.includes('oglas') || c.includes('sponsored')
  )) {
    score += W.CATEGORY
    matches.push('category:sponsored')
  }

  // Heuristike naslova
  const words = title.split(/\s+/).filter(Boolean)
  if (uppercaseRatio(item.title || '') > UPPERCASE_SHOUT_RATIO) {
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
 * Filtrira oglase. Doda isAd/adScore/adMatches.
 * @param items NewsItem[]
 * @param opts.threshold prag (privzeto 3). Več = strožji filter.
 */
export function filterAds<T extends NewsItem>(items: T[], opts?: { threshold?: number }): T[] {
  const threshold = opts?.threshold ?? 3
  return items.map((it) => {
    const { score, matches } = scoreAd(it)
    return {
      ...it,
      isAd: score >= threshold,
      adScore: score,
      adMatches: matches
    }
  })
}

/**
 * Vrne samo “ne-oglase” (če želiš že tukaj rezati).
 */
export function excludeAds<T extends NewsItem>(items: T[], opts?: { threshold?: number }): T[] {
  const threshold = opts?.threshold ?? 3
  return filterAds(items, { threshold }).filter(i => !i.isAd)
}
