// lib/adFilter.ts
// Poenostavljen filter (v5.0 - URL ONLY MODE).
// Blokira samo, če URL ali RSS kategorija eksplicitno vsebujeta "promo/oglas".

export const AD_THRESHOLD = 1 // Če najdemo match, je takoj oglas

// 1. URL VZORCI (To je glavni filter)
// Če URL vsebuje te nize, je 100% oglas.
const URL_BLOCK_PATTERNS = [
  /\/promo\//i,
  /\/oglasi\//i,
  /\/oglas\//i,
  /\/advertorial\//i,
  /\/sponzorirano\//i,
  /\/sponzor\//i,
  /\/partner\//i,
  /\/trgovina\//i,
  /\/nakup\//i,
  /[?&]utm_campaign=promo/i,
  /[?&]utm_medium=pr/i
]

// 2. RSS KATEGORIJE (Metadata iz vira)
// Če vir sam označi kategorijo kot "Promo", ji verjamemo.
const CATEGORY_BLOCK_PATTERNS = [
  'oglas',
  'promo',
  'sponzor', // sponzorirano, sponzor
  'advertorial',
  'pr članek',
  'pr sporocilo',
  'plačana objava',
  'vsebino omogoča'
]

function normalize(s?: string | null): string {
  if (!s) return ''
  return s.toLowerCase().trim()
}

function toCategories(x: any): string[] {
  if (!x) return []
  if (Array.isArray(x)) return x.map(String)
  if (typeof x === 'string') return [x]
  return []
}

export function scoreAd(item: any) {
  const matches: string[] = []
  let score = 0

  const url = String(item?.link || '')
  const categories = toCategories(item?.categories).map(normalize)

  // 1. PREVERJANJE URL-JA
  for (const rx of URL_BLOCK_PATTERNS) {
    if (rx.test(url)) {
        score = 10
        matches.push(`url:${rx.source}`)
        break // Dovolj je en match
    }
  }

  // 2. PREVERJANJE RSS KATEGORIJ (Če URL ni ujel)
  if (score === 0) {
      for (const cat of categories) {
          if (CATEGORY_BLOCK_PATTERNS.some(pattern => cat.includes(pattern))) {
              score = 10
              matches.push(`category:${cat}`)
              break
          }
      }
  }

  // PR score tukaj ni več relevanten, ker ne analiziramo teksta
  return { score, prScore: score, matches }
}

export function isLikelyAd(item: any, opts?: { threshold?: number, aggressive?: boolean }) {
  // Ignoriramo threshold in aggressive nastavitve, ker je ta filter binaren (je ali ni).
  const { score, matches } = scoreAd(item)
  
  const isAd = score > 0
  
  return { 
      isAd, 
      score, 
      matches, 
      hard: isAd, 
      pr: isAd 
  }
}

export function excludeAds<T>(items: T[], threshold = AD_THRESHOLD, aggressive = true): T[] {
  return items.filter((it: any) => !isLikelyAd(it).isAd)
}
