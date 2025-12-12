export type CategoryId = 
  | 'slovenija' 
  | 'svet' 
  | 'sport' 
  | 'kultura' 
  | 'magazin' 
  | 'gospodarstvo' 
  | 'tech' 
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
        // Dodana mesta in sklanjatve za Dnevnik/Siol lokalne novice
        'ljubljana', 'maribor', 'koper', 'celje', 'kranj', 'novo-mesto', 
        'slovenij' // Ujame "...v-sloveniji..."
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
    id: 'kultura',
    label: 'Kultura',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    keywords: ['/kultura/', '/kultur/', 'film', 'glasba', 'knjige', 'razstave', 'gledalisce', 'umetnost']
  },
  {
    id: 'magazin',
    label: 'Magazin',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    keywords: [
        '/magazin/', '/popin/', '/trendi/', '/scena/', '/zvezde/', '/zabava/', 
        '/lifestyle/', '/kulinarika/', '/okusno/', '/astro/', 'suzy', 'lady', 'dom-in-vrt',
        // Dodano za Dnevnik Nedeljski
        'prosti-cas', 'nedeljski', 'izleti'
    ]
  },
  {
    id: 'gospodarstvo',
    label: 'Gospodarstvo',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: ['/gospodarstvo/', '/posel/', '/finance/', '/borza/', 'kripto', 'delnice', 'podjetnistvo', 'banke', 'druzbe', 'posel-danes']
  },
  {
    id: 'tech',
    label: 'Znanost/Teh', 
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    keywords: ['/znanost/', '/tehnologija/', '/tech/', '/auto/', '/avto/', '/mobilnost/', '/digisvet/', 'vesolje', 'telefoni', 'racunalnistvo']
  },
  {
    id: 'kronika',
    label: 'Črna kronika',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    keywords: ['/kronika/', '/crna-kronika/', 'policija', 'gasilci', 'nesreca', 'umor', 'sodisce']
  }
]

// 2. LOGIKA ZAZNAVANJA (DETECTION PRIORITY)
const PRIORITY_CHECK_ORDER: CategoryId[] = [
  'sport', 
  'magazin', 
  'tech', 
  'gospodarstvo', 
  'kronika', 
  'kultura',
  'svet',
  'slovenija' // Catch-all na koncu
]

export function determineCategory(item: { link: string; categories?: string[] }): CategoryId {
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
