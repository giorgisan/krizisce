export type CategoryId = 
  | 'slovenija' 
  | 'svet' 
  | 'kronika'       // Premaknjeno višje
  | 'sport' 
  | 'gospodarstvo' 
  | 'moto'          // Avto + F1
  | 'tech'          // Tehnologija
  | 'magazin'       // Zabava, Lifestyle
  | 'kultura'       // Kultura
  | 'ostalo'

export type CategoryDef = {
  id: CategoryId
  label: string
  color: string 
  keywords: string[] 
}

// 1. VRSTNI RED PRIKAZA NA STRANI (UI)
// To določa, kako si sledijo zavihki v meniju.
export const CATEGORIES: CategoryDef[] = [
  {
    id: 'slovenija',
    label: 'Slovenija',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    keywords: [
        '/slovenija/', '/lokalno/', '/obcine/', '/volitve/', 'vlada', 'poslanci', 
        '/novice/slovenija/', 'domovina', 'notranja-politika',
        'ljubljana', 'maribor', 'celje', 'koper', 'kranj', 'novo-mesto', 
        'regije', 'slovenij', 
        // Pisma bralcev in mnenja
        '/mnenja/', '/pisma-bralcev/', 'javna-uprava', 'drzavni-zbor'
    ]
  },
  {
    id: 'svet',
    label: 'Svet',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    keywords: ['/svet/', '/tujina/', '/evropa/', '/zda/', 'ukrajina', 'rusija', 'vojna', 'nato', 'trump', '/novice/svet/', 'zunanja-politika', 'eu', 'bliznji-vzhod']
  },
  {
    id: 'kronika',
    label: 'Kronika',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    keywords: ['/kronika/', '/crna-kronika/', 'policija', 'gasilci', 'nesreca', 'umor', 'sodisce', 'kriminal', 'tragicno', 'sojenje']
  },
  {
    id: 'sport',
    label: 'Šport',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    keywords: ['/sport/', '/sportal/', 'nogomet', 'kosarka', 'zimski', 'atletika', 'kolesarstvo', 'tenis', 'ekipa24', 'sport.n1info.si', 'odbojka', 'rokomet', 'nhl', 'nba']
  },
  {
    id: 'gospodarstvo',
    label: 'Gospodarstvo',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: ['/gospodarstvo/', '/posel/', '/finance/', '/borza/', 'kripto', 'delnice', 'podjetnistvo', 'banke', 'druzbe', 'posel-danes', 'gospodarstvo', 'inflacija', 'bitcoin']
  },
  {
    id: 'moto',
    label: 'Avto', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    keywords: [
        '/auto/', '/avto/', 
        '/avtomobilnost/', // RTVSLO specifika
        '/avtomobilno/',   // DELO specifika
        '/avtomoto/',      // Siol/Splošno
        '/mobilnost/', '/motociklizem/', '/avtomotosport/', 
        'vozila', 'promet', 'elektricna-vozila', 'testi', 
        'avtomobilizem', 'volkswagen', 'bmw', 'audi', 'tesla', 'dizel', 'bencin', 'hibrid',
        'suv', 'limuzina', 'karavan', 'renault', 'toyota', 'peugeot', 'skoda', 'mercedes',
        // Dirke in F1 (da gre sem in ne v sport)
        'formula-1', 'f1', 'verstappen', 'hamilton', 'rally', 'moto-gp', 'dirka'
    ]
  },
  {
    id: 'tech',
    label: 'Tehnologija',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    keywords: [
        '/znanost/', '/tehnologija/', '/tech/', '/digisvet/', 
        'vesolje', 'telefoni', 'racunalnistvo', 'znanost', 'pametni', 
        'umetna-inteligenca', // 'ai' odstranjen, ker povzroča napake
        'apple', 'samsung', 'google', 'microsoft', 'nvidia', 'chatgpt', 'openai',
        'inovacije', 'razvoj', 'digitalno', 'nasa', 'spacex', 'astronomija',
        'aplikacija', 'internet', 'kibernet'
    ]
  },
  {
    id: 'magazin',
    label: 'Magazin',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    keywords: [
        '/magazin/', '/popin/', '/trendi/', '/scena/', '/zvezde/', '/zabava/', 
        '/lifestyle/', '/kulinarika/', '/okusno/', '/astro/', 'suzy', 'lady', 'dom-in-vrt',
        'prosti-cas', 'nedeljski', 'izleti', 'zdravje', 'dobro-pocutje',
        '/bulvar/', '/tuji-traci/', '/domaci-traci/', '/ljudje/', '/stil/', '/zanimivosti/',
        'zabava-in-slog', 'svet-zavoda', 'na-lepse', 'vrt', 'recepti', 'horoskop', 'resnicnostni-sov',
        // TV oddaje in resničnostni šovi
        '/tv-oddaje/', 'kmetija', 'ljubezen-po-domace', 'sanjski-moski'
    ]
  },
  {
    id: 'kultura',
    label: 'Kultura',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    keywords: [
        '/kultura/', '/kultur/', 'film', 'glasba', 'knjige', 'razstave', 'gledalisce', 
        'umetnost', 'koncert', 'festival', 'literatura', 'oder', 
        'pisatelj', 'pesnik', 'slikar', 'igralec', 'roman', 'premiera', 'kino'
    ]
  }
]

// 2. LOGIKA ZAZNAVANJA (Prioriteta)
// Vrstni red določa, katera kategorija "zmaga", če novice ustreza večim pogojem.
const PRIORITY_CHECK_ORDER: CategoryId[] = [
  'kronika',      // 1. Specifični URL-ji, vedno najprej
  'moto',         // 2. MOTO mora biti PRED Sport (za F1) in PRED Tech (za EV avte)
  'sport',        // 3. Šport
  'tech',         // 4. Tehnologija (pred Magazinom)
  'gospodarstvo', // 5.
  'kultura',      // 6. Kultura (pred Magazinom)
  'magazin',      // 7. Vse ostalo "rumeno"
  'svet',         // 8.
  'slovenija'     // 9.
]

// Helper za odstranjevanje šumnikov
const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function determineCategory(item: { link: string; categories?: string[] }): CategoryId {
  // 1. KORAK: Preveri URL (Najbolj zanesljivo)
  const url = item.link.toLowerCase()
  for (const id of PRIORITY_CHECK_ORDER) {
    const cat = CATEGORIES.find(c => c.id === id)
    if (cat && cat.keywords.some(k => url.includes(k))) {
      return cat.id
    }
  }

  // 2. KORAK: Preveri RSS kategorije (fallback)
  if (item.categories && item.categories.length > 0) {
    const rssCats = item.categories.map(c => unaccent(c)).join(' ')
    
    for (const id of PRIORITY_CHECK_ORDER) {
      const cat = CATEGORIES.find(c => c.id === id)
      if (cat && cat.keywords.some(k => {
         const cleanK = unaccent(k.replace(/\//g, '')) 
         return cleanK.length > 3 && rssCats.includes(cleanK) 
      })) {
        return cat.id
      }
    }
  }

  return 'ostalo'
}

export function getKeywordsForCategory(catId: string): string[] {
  const cat = CATEGORIES.find(c => c.id === catId)
  return cat ? cat.keywords : []
}
