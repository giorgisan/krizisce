// lib/adFilter.ts
// Lokalni filter za sponzorirano/PR/oglasno vsebino (v4.2 - BULLETPROOF).

export const AD_THRESHOLD = 3            
export const AGGRESSIVE_PR_THRESHOLD = 5 

// --- 1. VARNE BESEDE (WHITELIST) ---
// Če članek vsebuje katero od teh besed, je AVTOMATSKO NOVICA (score = 0).
const SAFE_KEYWORDS = [
  // POLITIKA
  'vlada', 'minister', 'premier', 'golob', 'jansa', 'logar', 'pirc musar',
  'poslanci', 'drzavni zbor', 'koalicija', 'opozicija', 'sindikat', 'stavka', 'stranka', 'referendum',
  
  // KRONIKA, SATORI, KRIMINAL (Zelo pomembno!)
  'policija', 'policist', 'gasilci', 'resevalci', 'sodisce', 'tozilstvo', 'tozilec', 'zapor', 'aretacija',
  'umor', 'smrt', 'nesreca', 'trcenje', 'potres', 'poplave', 'pozar', 'neurje',
  'nasilje', 'napad', 'rop', 'kriminal', 'streljanje', 'strel', 'krivda', 'obtozba', 'obtozen',
  'preiskav', 'hisna preiskava', 'kriminalist', 'korupci', 'fiktivn', 'goljufij', 'poslovna goljufija',
  'sum ', 'sumi', 'nepravilnosti', 'zloraba', 'incident', 'inspektor', 'sojenje', 'zaporna kazen',
  
  // MEDIJI, TV & FILM
  'televizij', 'oddaja', 'voditelj', 'resnicnostni sov', 'kmetija', 'film', 'serija', 'kino', 'premiera',
  'programski svet', 'rtv', 'pop tv', 'planet tv', 'gledalci', 'mediji', 'avatar', 'spektakel',
  
  // SMRT & SLOVO
  'umrl', 'umrla', 'preminul', 'preminula', 'poslovil', 'slovo', 'osmrtnica', 'pokojni',
  
  // SVET & KONFLIKTI
  'vojna', 'ukrajina', 'rusija', 'gaza', 'izrael', 'nato', 'eu', 'zda', 'trump', 'biden', 'putin',
  
  // ŠPORT
  'nogomet', 'kosarka', 'sport', 'tekma', 'olimpijske', 'liga', 'prvenstvo', 'pokal', 'stozice',
  'zadetek', 'gol', 'rezultat', 'lestvica', 'trener', 'igralec', 'reprezentanca', 'izkljucen', 'sodnik',
  
  // ZNANOST & NARAVA
  'znanost', 'odkritje', 'vesolje', 'nasa', 'astronomija', 'umetna inteligenca', 'ai', 
  'dnk', 'genetika', 'raziskava', 'studija', 'znanstveniki', 'medved', 'zivali', 'okolje',
  
  // MAGAZIN / LIFESTYLE (Prevido pri ona-on, ampak če je "ljubezen", "zmenki", je to Magazin)
  'ljubezen', 'zmenki', 'samski', 'poroka', 'locitev', 'horoskop'
]

const KEYWORDS = [
  'oglasno sporočilo','promocijsko sporočilo','plačana objava','sponzorirano',
  'oglasni prispevek','komercialno sporočilo','oglasna vsebina','v sodelovanju z',
  'partner vsebina','sporočilo za javnost','pr prispevek','partnerstvo','branded content',
  'sponsored','sponsored content','advertorial','paid post','promotion','partner content'
]

const STRONG_TOKENS = ['promo','advertorial','[ad]','[pr]','sponzorirano'] 

const WEAK = ['akcija','popust','kupon','super cena','kupite','naročite','prihrani','ponudba','znižanje','razprodaja','prihranite']

const PR_PHRASES = [
  'je predstavil novo','je lansiral','na trg prihaja','nova rešitev za',
  'vodilni ponudnik','vrhunska kakovost','za profesionalno rabo',
  'brezplačno preizkusite','preizkusite zdaj','paket vključuje'
]

const FINANCE_PR = [
  'naložbe','investicij','investiraj','varčevanje',
  'priložnosti kapitalskih trgov','odprite trgovalni račun','donosnost sklada',
  'brez vstopnih stroškov'
]

const PR_VERBS_ADVICE = ['svetuje','priporoča','predlaga','prinaša nasvete']
const HOWTO_HINTS = ['kako ', 'how to ', 'nasveti za']

const URL_PATTERNS_STRONG = [
  /\/oglas\//i, /\/oglasi\//i, /\/promo\//i, /\/promocij\//i, /\/sponzor\//i, /\/advert\//i, /[?&]utm_campaign=promo/i
]
const URL_SECTION_HINTS = [
  /siol\.net\/novice\/posel-danes\//i
]

const AUTHOR_PATTERNS = [/^\s*pr\s*$/i, /marketing/i, /komunikacije/i, /uredništvo pr/i]

const UPPERCASE_SHOUT_RATIO = 0.6
const SHORT_TITLE_MAX = 5

const W = {
  KEYWORD: 10, 
  STRONG: 3, 
  URL: 5, 
  URL_HINT: 1, 
  AUTHOR: 4,
  WEAK: 1, 
  SHOUT: 1, 
  SHORT: 1, 
  CATEGORY: 2, 
  PR: 2, 
  FIN: 2, 
  HOWTO: 1, 
  BRAND_ADVICE: 2
}

function normalize(s?: string | null): string {
  if (!s) return ''
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
  if (Array.isArray(x)) return x.map(String)
  if (typeof x === 'string') return [x]
  return []
}

function brandAdvicePattern(titleRaw: string): boolean {
  const t = (titleRaw || '').trim()
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

  // --- 0. VARNOSTNA ZAVORA (SAFEGUARD) ---
  for (const safe of SAFE_KEYWORDS) {
      if (hay.includes(normalize(safe))) { // uporabi normalize za safe check
          return { score: 0, prScore: 0, matches: [`safe:${safe}`] }
      }
  }
  
  for (const k of KEYWORDS) if (hay.includes(normalize(k))) { score += W.KEYWORD; matches.push(`kw:${k}`) }
  
  for (const t of STRONG_TOKENS) {
      if (title.includes(normalize(t))) { score += W.STRONG; matches.push(`strong_title:${t}`) }
  }

  // Weak tokens check
  const isSport = hay.includes('tekma') || hay.includes('liga') || hay.includes('trener')
  if (!isSport) {
      for (const w of WEAK) if (hay.includes(normalize(w))) { score += W.WEAK; matches.push(`weak:${w}`) }
  }

  for (const p of PR_PHRASES) if (hay.includes(normalize(p))) { prScore += W.PR; matches.push(`pr:${p}`) }
  for (const p of FINANCE_PR) if (hay.includes(normalize(p))) { prScore += W.FIN; matches.push(`fin:${p}`) }

  if (PR_VERBS_ADVICE.some(v => hay.includes(normalize(v))) && HOWTO_HINTS.some(h => title.includes(normalize(h)))) {
    prScore += W.HOWTO
    matches.push('howto:advice')
  }

  if (brandAdvicePattern(titleRaw)) {
    prScore += W.BRAND_ADVICE
    matches.push('brand_advice:title')
  }

  for (const rx of URL_PATTERNS_STRONG) if (rx.test(url)) { score += W.URL; matches.push(`url:${rx.source}`) }
  for (const rx of URL_SECTION_HINTS) if (rx.test(url)) { prScore += W.URL_HINT; matches.push(`urlhint:${rx.source}`) }
  for (const rx of AUTHOR_PATTERNS) if (rx.test(author)) { score += W.AUTHOR; matches.push(`author:${rx.source}`) }

  if (categories.some(c =>
    c.indexOf('sponzor') >= 0 || c.indexOf('promo') >= 0 || c.indexOf('oglas') >= 0 ||
    c === 'pr' || (c && c.indexOf('pr:') === 0)
  )) {
    score += W.CATEGORY
    matches.push('category:sponsored/pr')
  }

  const words = title.split(/\s+/).filter(Boolean)
  if (uppercaseRatio(titleRaw) > UPPERCASE_SHOUT_RATIO) { score += W.SHOUT; matches.push('shout:title_uppercase') }
  
  if (words.length <= SHORT_TITLE_MAX && STRONG_TOKENS.some(t => title.indexOf(normalize(t)) >= 0)) {
    score += W.SHORT; matches.push('short+strong')
  }

  return { score, prScore, matches }
}

export function isLikelyAd(item: any, opts?: { threshold?: number, aggressive?: boolean }) {
  const threshold = opts?.threshold ?? AD_THRESHOLD
  const aggressive = opts?.aggressive ?? true
  
  const { score, prScore, matches } = scoreAd(item)
  
  if (matches.some(m => m.startsWith('safe:'))) {
      return { isAd: false, score: 0, matches, hard: false, pr: false }
  }

  const isHardAd = score >= threshold
  const isPR = aggressive && prScore >= AGGRESSIVE_PR_THRESHOLD
  return { isAd: isHardAd || isPR, score: isHardAd ? score : prScore, matches, hard: isHardAd, pr: isPR }
}

export function excludeAds<T>(items: T[], threshold = AD_THRESHOLD, aggressive = true): T[] {
  return items.filter((it: any) => !isLikelyAd(it, { threshold, aggressive }).isAd)
}
