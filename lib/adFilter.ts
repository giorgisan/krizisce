// lib/adFilter.ts
// Lokalni filter za sponzorirano/PR/oglasno vsebino (v3).
// Dodane tarče: "vam svetuje/priporoča", "kako ..." naslovi, in sekcijski namigi (npr. siol.net/posel-danes).

export const AD_THRESHOLD = 3            // jasne oznake
export const AGGRESSIVE_PR_THRESHOLD = 4 // PR jezik

// --- Jasne oznake ---
const KEYWORDS = [
  'oglasno sporočilo','promocijsko sporočilo','plačana objava','sponzorirano',
  'oglasni prispevek','komercialno sporočilo','oglasna vsebina','v sodelovanju z',
  'partner vsebina','sporočilo za javnost','pr prispevek','partnerstvo','branded content',
  'sponsored','sponsored content','advertorial','paid post','promotion','partner content','press release'
]

const STRONG_TOKENS = ['promo','oglas','advertorial','ad:','[ad]','pr:','[pr]','sponzorirano']

const WEAK = ['akcija','popust','kupon','super cena','kupite','naročite','prihrani','ponudba']

// PR jezik / produktni žargon
const PR_PHRASES = [
  'je predstavil','je predstavila','so predstavili','predstavlja','predstavili',
  'platforma','rešitev','storitev','posodobitev','prenovljeno','lansiral','zagnal',
  'za profesionalce','za menedžerje','za izvajalce','za podjetja',
  'analitika','dashboard','upravljanje','orodje za','saas','registracija','prijava',
  'brezplačno preizkusite','preizkusite brezplačno','na voljo','dostopno','paket','naročniški',
  'partnerji','stranke','uporabniki','ekosistem'
]

const FINANCE_PR = [
  'naložbe','naložbeni','investicij','investiraj','varčevanje','obresti',
  'priložnosti kapitalskih trgov','kapitalskih trgov','donos','donosnost',
  'odpri račun','odprite račun','sklad','vzajemni sklad','borza','do %','% letno','prvo leto','brez vstopnih stroškov'
]

// Dodatni “how-to PR” vzorci (brand -> vam svetuje/priporoča kako ...)
const PR_VERBS_ADVICE = ['svetuje','priporoča','predlaga','prinaša nasvete']
const HOWTO_HINTS = ['kako ','how to ']

// Vzorci URL-jev (močni) + sekcijski namigi (šibki)
const URL_PATTERNS_STRONG = [
  /\/oglas/i,/\/oglasi/i,/\/promo/i,/\/promocij/i,/\/sponzor/i,/\/advert/i,/[?&]utm_campaign=promo/i
]

// Sekcijski namigi, ki pogosto skrivajo PR (majhna teža, kombinatorni)
const URL_SECTION_HINTS = [
  /siol\.net\/novice\/posel-danes\//i
]

const AUTHOR_PATTERNS = [/^\s*pr\s*$/i,/marketing/i,/komunikacije/i,/uredništvo pr/i]

const UPPERCASE_SHOUT_RATIO = 0.6
const SHORT_TITLE_MAX = 5

const W = {
  KEYWORD: 3, STRONG: 3, URL: 2, URL_HINT: 1, AUTHOR: 2,
  WEAK: 1, SHOUT: 1, SHORT: 1, CATEGORY: 2, PR: 2, FIN: 2, HOWTO: 2, BRAND_ADVICE: 3
}

function normalize(s?: string | null): string {
  if (!s) return ''
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
}

function uppercaseRatio(s: string): number {
  const letters = s.replace(/[^A-Za-zČŠŽĆĐÀ-ÿ]/g, '')
  if (!letters.length) return 0
  const upp = letters.replace(/[^A-ZČŠŽĆĐ]/g, '')
  return upp.length / letters.length
}

function toCategories(x: any): string[] {
  if (!x) return []
  if (Array.isArray(x)) return x.map(String)
  if (typeof x === 'string') return [x]
  return []
}

// Detekcija "Brand vam svetuje ... kako ..."
function brandAdvicePattern(titleRaw: string): boolean {
  const t = titleRaw.trim()
  // Začetek z veliko začetnico (brand) + " vam|ti|nam " + (svetuje|priporoča|predlaga)
  const rx = /^[A-ZŠČŽĆĐ][^,.:!?]{1,60}\s+(vam|ti|nam)\s+(svetuje|priporoča|predlaga)\b/i
  return rx.test(t)
}

export function scoreAd(item: any) {
  const matches: string[] = []
  let score = 0
  let prScore = 0

  const titleRaw = item?.title || ''
  const title = normalize(titleRaw)
  const desc = normalize(item?.description || item?.contentSnippet || '')
  const html = normalize(item?.content || item?.['content:encoded'] || '')
  const url = String(item?.link || '')
  const author = normalize(item?.author || '')
  const categories = toCategories(item?.categories).map(normalize)
  const hay = `${title}\n${desc}\n${html}`

  for (const k of KEYWORDS) if (hay.includes(normalize(k))) { score += W.KEYWORD; matches.push(`kw:${k}`) }
  for (const t of STRONG_TOKENS) if (title.includes(normalize(t)) || desc.includes(normalize(t))) { score += W.STRONG; matches.push(`strong:${t}`) }
  for (const w of WEAK) if (hay.includes(normalize(w))) { score += W.WEAK; matches.push(`weak:${w}`) }

  for (const p of PR_PHRASES) if (hay.includes(normalize(p))) { prScore += W.PR; matches.push(`pr:${p}`) }
  for (const p of FINANCE_PR) if (hay.includes(normalize(p))) { prScore += W.FIN; matches.push(`fin:${p}`) }

  // how-to PR namigi
  if (PR_VERBS_ADVICE.some(v => hay.includes(normalize(v))) && HOWTO_HINTS.some(h => title.includes(normalize(h)))) {
    prScore += W.HOWTO
    matches.push('howto:advice+kako')
  }

  // brandAdvice začetni vzorec
  if (brandAdvicePattern(titleRaw)) {
    prScore += W.BRAND_ADVICE
    matches.push('brand_advice:title')
  }

  for (const rx of URL_PATTERNS_STRONG) if (rx.test(url)) { score += W.URL; matches.push(`url:${rx.source}`) }
  for (const rx of URL_SECTION_HINTS) if (rx.test(url)) { prScore += W.URL_HINT; matches.push(`urlhint:${rx.source}`) }
  for (const rx of AUTHOR_PATTERNS) if (rx.test(author)) { score += W.AUTHOR; matches.push(`author:${rx.source}`) }

  if (categories.some(c => c.includes('sponzor') || c.includes('promo') || c.includes('oglas') || c.includes('sponsored'))) {
    score += W.CATEGORY
    matches.push('category:sponsored')
  }

  const words = title.split(/\s+/).filter(Boolean)
  if (uppercaseRatio(titleRaw) > UPPERCASE_SHOUT_RATIO) { score += W.SHOUT; matches.push('shout:title_uppercase') }
  if (words.length <= SHORT_TITLE_MAX && STRONG_TOKENS.some(t => title.includes(normalize(t)))) {
    score += W.SHORT; matches.push('short+strong')
  }

  return { score, prScore, matches }
}

export function isLikelyAd(item: any, opts?: { threshold?: number, aggressive?: boolean }) {
  const threshold = opts?.threshold ?? AD_THRESHOLD
  const aggressive = opts?.aggressive ?? true
  const { score, prScore, matches } = scoreAd(item)
  const isHardAd = score >= threshold
  const isPR = aggressive && prScore >= AGGRESSIVE_PR_THRESHOLD
  return { isAd: isHardAd || isPR, score: isHardAd ? score : prScore, matches, hard: isHardAd, pr: isPR }
}

export function excludeAds<T>(items: T[], threshold = AD_THRESHOLD, aggressive = true): T[] {
  return items.filter((it: any) => !isLikelyAd(it, { threshold, aggressive }).isAd)
}
