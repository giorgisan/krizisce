// lib/adFilter.ts
// Poenostavljen filter (v6.2 - EXACT MATCH FOR CATEGORIES).
// Preprečuje, da bi novice O oglasih (npr. ChatGPT z oglasi) blokirali kot oglase.

export const AD_THRESHOLD = 1 // Če najdemo match, je takoj oglas

// 1. URL VZORCI (Glavni filter - ostaja nespremenjen, ker deluje dobro)
const URL_BLOCK_PATTERNS = [
  // --- GENERIČNI VZORCI ---
  /\/promo\//i,
  /\/oglasi\//i,
  /\/advertorial\//i,
  /\/sponzorirano\//i,
  /\/sponzor\//i,
  /\/nakup\//i,
  /\/marketing\//i,
  /\/naročena-vsebina\//i,
  /\/plačana-objava\//i,
  /[?&]utm_campaign=promo/i,
  /[?&]utm_medium=pr/i,
  /[?&]utm_source=advertorial/i,

  // --- SPECIFIČNI POPRAVKI ZA NATANČNOST ---
  /\/oglas\/$/i,                 // URL se konča z /oglas/
  /^https:\/\/n1info\.si\/oglas\//i, // N1 specifična rubrika za oglase

  // --- DELO.SI ---
  /\/svet-kapitala\//i, 
  /\/dpc-/, 

  // --- SLOVENSKE NOVICE ---
  /\/avtor\/promo-/i, 
  /\/promo-/, 

  // --- SIOL.NET ---
  /\/advertorial-/i, 

  // --- FINANCE.SI ---
  /\/promocijsko-sporocilo\//i,
    
  // --- ŽURNAL24 ---
  /\/magazin\/promo\//i,
  /\/uporabno\//i,       
    
  // --- 24UR ---
  /\/sponzorirana-vsebina\//i
]

// 2. RSS KATEGORIJE (Metadata iz vira)
const CATEGORY_BLOCK_PATTERNS = [
  'oglas',
  'promo',
  'sponzor', 
  'advertorial',
  'pr članek',
  'pr sporocilo',
  'plačana objava',
  'vsebino omogoča',
  'promocijsko sporočilo',
  'delov poslovni center',
  'podjetniške zvezde'
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

  // 1. PREVERJANJE URL-JA (Najbolj zanesljivo)
  for (const rx of URL_BLOCK_PATTERNS) {
    if (rx.test(url)) {
        score = 10
        matches.push(`url:${rx.source}`)
        break 
    }
  }

  // 2. PREVERJANJE RSS KATEGORIJ (Natančno ujemanje za kratke besede)
  if (score === 0) {
      for (const cat of categories) {
          const isAdCategory = CATEGORY_BLOCK_PATTERNS.some(pattern => {
              // Če je vzorec kratek (npr. 'oglas'), mora biti kategorija TOČNO taka.
              // To prepreči, da bi "digitalno/oglasi" blokiralo novico o ChatGPT oglasih.
              if (pattern.length < 7) {
                  return cat === pattern;
              }
              // Za daljše fraze (npr. 'plačana objava') še vedno pustimo delno ujemanje.
              return cat.includes(pattern);
          });

          if (isAdCategory) {
              score = 10
              matches.push(`category:${cat}`)
              break
          }
      }
  }

  return { score, prScore: score, matches }
}

export function isLikelyAd(item: any, opts?: { threshold?: number, aggressive?: boolean }) {
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
