// lib/categories.ts

export type CategoryId = 
  | 'slovenija' 
  | 'svet' 
  | 'sport' 
  | 'magazin'       // Vključuje kulturo, zabavo, zdravje
  | 'gospodarstvo' 
  | 'moto'          // Avtomobilizem (ločeno zaradi popularnosti v SLO)
  | 'tech'          // Znanost in tehnologija
  | 'kronika' 
  | 'ostalo'

export type CategoryDef = {
  id: CategoryId
  label: string
  color: string 
  keywords: string[] 
}

// 1. VRSTNI RED PRIKAZA (UI)
export const CATEGORIES: CategoryDef[] = [
  {
    id: 'slovenija',
    label: 'Slovenija',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    keywords: [
        '/slovenija/', '/lokalno/', '/obcine/', '/volitve/', 'vlada', 'poslanci', 
        '/novice/slovenija/', 'domovina', 'notranja-politika',
        'ljubljana', 'maribor', 'celje', 'koper', 'kranj', 'novo-mesto', 
        'regije', 'slovenij' 
    ]
  },
  {
    id: 'svet',
    label: 'Svet',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    keywords: ['/svet/', '/tujina/', '/evropa/', '/zda/', 'ukrajina', 'rusija', 'vojna', 'nato', 'trump', '/novice/svet/', 'zunanja-politika']
  },
  {
    id: 'sport',
    label: 'Šport',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    keywords: ['/sport/', '/sportal/', 'nogomet', 'kosarka', 'zimski', 'atletika', 'kolesarstvo', 'f1', 'moto', 'tenis', 'ekipa24', 'sport.n1info.si']
  },
  {
    id: 'gospodarstvo',
    label: 'Gospodarstvo',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: ['/gospodarstvo/', '/posel/', '/finance/', '/borza/', 'kripto', 'delnice', 'podjetnistvo', 'banke', 'druzbe', 'posel-danes', 'gospodarstvo']
  },
  {
    id: 'magazin',
    label: 'Magazin', // Združuje zabavo, kulturo, lifestyle
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    keywords: [
        '/magazin/', '/popin/', '/trendi/', '/scena/', '/zvezde/', '/zabava/', 
        '/lifestyle/', '/kulinarika/', '/okusno/', '/astro/', 'suzy', 'lady', 'dom-in-vrt',
        'prosti-cas', 'nedeljski', 'izleti', 'zdravje', 'dobro-pocutje',
        '/bulvar/', '/tuji-traci/', '/domaci-traci/', '/ljudje/', '/stil/', '/zanimivosti/',
        'zabava-in-slog', 'svet-zavoda', 'na-lepse',
        // KULTURA keywords združeni tukaj:
        '/kultura/', '/kultur/', 'film', 'glasba', 'knjige', 'razstave', 'gledalisce', 'umetnost', 'koncert', 'festival'
    ]
  },
  {
    id: 'moto',
    label: 'Avto', // Kratko ime za UI
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    keywords: [
        '/auto/', '/avto/', '/mobilnost/', '/motociklizem/', 
        'vozila', 'promet', 'elektricna-vozila', 'testi', 'formula', 
        'avtomobilizem', 'volkswagen', 'bmw', 'audi', 'tesla', 'dizel', 'bencin'
    ]
  },
  {
    id: 'tech',
    label: 'Tech',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    keywords: [
        '/znanost/', '/tehnologija/', '/tech/', '/digisvet/', 
        'vesolje', 'telefoni', 'racunalnistvo', 'znanost', 'pametni', 
        'umetna-inteligenca', 'ai', 'apple', 'samsung', 'google', 'microsoft',
        'inovacije', 'razvoj', 'digitalno'
    ]
  },
  {
    id: 'kronika',
    label: 'Kronika',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    keywords: ['/kronika/', '/crna-kronika/', 'policija', 'gasilci', 'nesreca', 'umor', 'sodisce', 'kriminal', 'tragicno']
  }
]

// 2. LOGIKA ZAZNAVANJA (Prioriteta)
const PRIORITY_CHECK_ORDER: CategoryId[] = [
  'kronika',      // Kronika ima visoko prioriteto (specifični URL-ji)
  'sport', 
  'moto',         // Preverimo moto pred techom in gospodarstvom
  'tech', 
  'gospodarstvo', 
  'magazin',      // Magazin "polovi" vse ostalo lifestyle/kultura
  'svet',
  'slovenija'
]

// Helper za odstranjevanje šumnikov
const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function determineCategory(item: { link: string; categories?: string[] }): CategoryId {
  // 1. KORAK: Preveri RSS kategorije (če obstajajo)
  if (item.categories && item.categories.length > 0) {
    const rssCats = item.categories.map(c => unaccent(c)).join(' ')
    
    for (const id of PRIORITY_CHECK_ORDER) {
      const cat = CATEGORIES.find(c => c.id === id)
      // Pri RSS kategorijah smo bolj strogi (ujemanje besed)
      if (cat && cat.keywords.some(k => {
         const cleanK = unaccent(k.replace(/\//g, '')) 
         return cleanK.length > 3 && rssCats.includes(cleanK) 
      })) {
        return cat.id
      }
    }
  }

  // 2. KORAK: Preveri URL (najbolj zanesljivo)
  const url = item.link.toLowerCase()
  for (const id of PRIORITY_CHECK_ORDER) {
    const cat = CATEGORIES.find(c => c.id === id)
    if (cat && cat.keywords.some(k => url.includes(k))) {
      return cat.id
    }
  }

  return 'ostalo'
}

export function getKeywordsForCategory(catId: string): string[] {
  const cat = CATEGORIES.find(c => c.id === catId)
  return cat ? cat.keywords : []
}
