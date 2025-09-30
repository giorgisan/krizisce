// lib/adFilter.ts
// Lokalni filter za sponzorirano/oglasno/PR vsebino za Križišče.
// v2: doda detekcijo "product promo / brand PR" jezika (analitika, platforma, za profesionalce, priložnosti kapitalskih trgov ...)

// --- Nastavitve ---
export const AD_THRESHOLD = 3            // zmeren
export const AGGRESSIVE_PR_THRESHOLD = 4 // strožji za PR-jezik

// --- Ključne besede (jasne oznake) ---
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
  'partnerstvo',
  'branded content',
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

// Šibkejši “sales” izrazi (majhna teža)
const WEAK = [
  'akcija', 'popust', 'kupon', 'super cena', 'kupite', 'naročite', 'prihrani', 'ponudba'
]

// PR/marketinški jezik, ki pogosto označuje produktno/biz vsebino (brez transparentne oznake)
const PR_PHRASES = [
  'je predstavil', 'je predstavila', 'so predstavili', 'predstavlja',
  'platforma', 'rešitev', 'storitev', 'posodobitev', 'prenovljeno',
  'za profesionalce', 'za menedžerje', 'za izvajalce', 'za podjetja',
  'analitika', 'dashboard', 'upravljanje', 'orodje za', 'saas',
  'registracija', 'prijava', 'brezplačno preizkusite', 'preizkusite brezplačno',
  'na voljo', 'dostopno', 'paket', 'naročniški',
  'partnerji', 'stranke', 'uporabniki', 'ekosistem',
]

// Finance-specifični PR signali
const FINANCE_PR = [
  'naložbe', 'naložbeni', 'investicij', 'investiraj', 'varčevanje', 'obresti',
  'priložnosti kapitalskih trgov', 'kapitalskih trgov', 'donos', 'donosnost',
  'odpri račun', 'odprite račun', 'sklad', 'vzajemni sklad', 'borza',
  'do %', '% letno', 'prvo leto', 'brez vstopnih stroškov'
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
  KEYWORD: 3,
  STRONG: 3,
  URL: 2,
  AUTHOR: 2,
  WEAK: 1,
  SHOUT: 1,
  SHORT: 1,
  CATEGORY: 2,
  PR: 2,
  FIN: 2
}

function normalize(s?: string | null): string {
  if (!s) return ''
  return s
    .toLowerCase()
    .normalize('NFD')
    // @ts-ignore
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

function uppercaseRatio(s: string): number {
  const letters = s.replace(/[^A-Za-zČŠŽĆĐÀ-ÿ]/g, '')
  if (!letters.length) return 0
  const upp = letters.replace(/[^A-ZČŠŽĆĐ]/g, '')
  return upp.length / letters.length
}

function toCategories(x: any): string[] {
  if (!x) return []
  if (Array.isArray(x)) return x.map((v) => String(v))
  if (typeof x === 'string') return [x]
  return []
}

// Nekaj pogostih kratic, ki niso “brand shouts” (da ne kaznujemo EU, ZDA ipd.)
const SAFE_ACRONYMS = new Set(['EU','NATO','ZDA','ZAE','STA','RTVSLO','N1','UK','ECB','IMF','WHO'])

function hasSuspiciousAcronym(titleRaw: string): boolean {
  const words = (titleRaw || '').split(/\s+/)
  // all-caps besede dolžine 3–6, razen safe
  return words.some(w => /^[A-ZČŠŽĆĐ]{3,6}$/.test(w) && !SAFE_ACRONYMS.has(w))
}

export function scoreAd(item: any) {
  const matches: string[] = []
  let score = 0
  let prScore = 0 // ločen “komercialnost” signal (agresivni način)

  const titleRaw = item?.title || ''
  const title = normalize(titleRaw)
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

  for (const p of PR_PHRASES) {
    if (hay.includes(normalize(p))) {
      prScore += W.PR
      matches.push(`pr:${p}`)
    }
  }

  for (const p of FINANCE_PR) {
    if (hay.includes(normalize(p))) {
      prScore += W.FIN
      matches.push(`fin:${p}`)
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
  if (uppercaseRatio(titleRaw) > UPPERCASE_SHOUT_RATIO) {
    score += W.SHOUT
    matches.push('shout:title_uppercase')
  }
  if (words.length <= SHORT_TITLE_MAX && STRONG_TOKENS.some(t => title.includes(normalize(t)))) {
    score += W.SHORT
    matches.push('short+strong')
  }

  if (hasSuspiciousAcronym(titleRaw)) {
    prScore += 1
    matches.push('pr:brand_acronym')
  }

  return { score, prScore, matches }
}

/**
 * Vrne { isAd, score, matches }. Upošteva tudi “komercialnost” (prScore).
 * @param opts.threshold prag za jasne oznake (privzeto AD_THRESHOLD)
 * @param opts.aggressive če true, aktivira PR heuristiko (prScore >= AGGRESSIVE_PR_THRESHOLD)
 */
export function isLikelyAd(item: any, opts?: { threshold?: number, aggressive?: boolean }) {
  const threshold = opts?.threshold ?? AD_THRESHOLD
  const aggressive = opts?.aggressive ?? true
  const { score, prScore, matches } = scoreAd(item)
  const isHardAd = score >= threshold
  const isPR = aggressive && prScore >= AGGRESSIVE_PR_THRESHOLD
  return { isAd: isHardAd || isPR, score: isHardAd ? score : prScore, matches, hard: isHardAd, pr: isPR }
}

/**
 * Vrne array brez oglasov/PR.
 */
export function excludeAds<T>(items: T[], threshold = AD_THRESHOLD, aggressive = true): T[] {
  return items.filter((it: any) => !isLikelyAd(it, { threshold, aggressive }).isAd)
}
