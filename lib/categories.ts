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
    id: 'kultura',
    label: 'Kultura',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    keywords: ['/kultura/', '/kultur/', 'film', 'glasba', 'knjige', 'razstave', 'gledalisce', 'umetnost', 'koncert', 'festival']
  },
  {
    id: 'magazin',
    label: 'Magazin',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    keywords: [
        '/magazin/', '/popin/', '/trendi/', '/scena/', '/zvezde/', '/zabava/', 
        '/lifestyle/', '/kulinarika/', '/okusno/', '/astro/', 'suzy', 'lady', 'dom-in-vrt',
        'prosti-cas', 'nedeljski', 'izleti',
        // DODANO: Bulvar in podkategorije (vendar bo Kultura imela prednost zaradi vrstnega reda spodaj)
        '/bulvar/', '/tuji-traci/', '/domaci-traci/', '/ljudje/', '/stil/', '/zanimivosti/'
    ]
  },
  {
    id: 'gospodarstvo',
    label: 'Gospodarstvo',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: ['/gospodarstvo/', '/posel/', '/finance/', '/borza/', 'kripto', 'delnice', 'podjetnistvo', 'banke', 'druzbe', 'posel-danes', 'gospodarstvo']
  },
  {
    id: 'tech',
    label: 'Znanost/Teh',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    keywords: ['/znanost/', '/tehnologija/', '/tech/', '/auto/', '/avto/', '/mobilnost/', '/digisvet/', 'vesolje', 'telefoni', 'racunalnistvo', 'znanost']
  },
  {
    id: 'kronika',
    label: 'Črna kronika',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    keywords: ['/kronika/', '/crna-kronika/', 'policija', 'gasilci', 'nesreca', 'umor', 'sodisce']
  }
]

// 2. LOGIKA ZAZNAVANJA (Prioriteta)
// POMEMBNO: Vrstni red določa, katera kategorija zmaga, če jih ustreza več.
const PRIORITY_CHECK_ORDER: CategoryId[] = [
  'sport', 
  'tech', 
  'gospodarstvo', 
  'kronika',
  'kultura',  // PREMAKNJENO VIŠJE: Kultura se preveri PRED Magazinom
  'magazin',  // Če ni kultura (film, glasba...), potem preveri, če je Magazin (bulvar, trači...)
  'svet',
  'slovenija'
]

// Helper za odstranjevanje šumnikov
const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function determineCategory(item: { link: string; categories?: string[] }): CategoryId {
  // 1. KORAK: Preveri RSS kategorije
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

  // 2. KORAK: Preveri URL
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
