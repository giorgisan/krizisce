export type CategoryId = 
  | 'slovenija' 
  | 'svet' 
  | 'kronika' 
  | 'sport' 
  | 'gospodarstvo' 
  | 'moto'          
  | 'tech'          
  | 'magazin'       
  | 'kultura'       
  | 'ostalo'

export type CategoryDef = {
  id: CategoryId
  label: string
  color: string 
  keywords: string[] 
}

// 1. VRSTNI RED PRIKAZA NA STRANI (UI)
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
        '/mnenja/', '/pisma-bralcev/', 'javna-uprava', 'drzavni-zbor'
    ]
  },
  {
    id: 'svet',
    label: 'Svet',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    keywords: ['/svet/', '/tujina/', '/evropa/', '/zda/', 'ukrajina', 'rusija', 'vojna', 'nato', 'trump', '/novice/svet/', 'zunanja-politika', 'eu', 'bliznji-vzhod', 'gaza', 'izrael']
  },
  {
    id: 'kronika',
    label: 'Kronika',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    keywords: ['/kronika/', '/crna-kronika/', 'policija', 'gasilci', 'nesreca', 'umor', 'sodisce', 'kriminal', 'tragicno', 'sojenje', 'napad', 'rop']
  },
  {
    id: 'sport',
    label: 'Šport',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    keywords: ['/sport/', '/sportal/', 'nogomet', 'kosarka', 'zimski', 'atletika', 'kolesarstvo', 'tenis', 'ekipa24', 'sport.n1info.si', 'odbojka', 'rokomet', 'nhl', 'nba', 'doncic', 'kopitar', 'pogacar', 'roglic']
  },
  {
    id: 'gospodarstvo',
    label: 'Gospodarstvo',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: ['/gospodarstvo/', '/posel/', '/finance/', '/borza/', 'kripto', 'delnice', 'podjetnistvo', 'banke', 'druzbe', 'posel-danes', 'gospodarstvo', 'inflacija', 'bitcoin', 'evro']
  },
  {
    id: 'moto',
    label: 'Avto', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    keywords: [
        '/auto/', '/avto/', 
        '/avtomobilnost/', // RTVSLO
        '/avtomobilno/',   // DELO
        '/avtomoto/',      // Siol
        '/mobilnost/', '/motociklizem/', '/avtomotosport/', 
        'vozila', 'promet', 'elektricna-vozila', 'testi', 
        'avtomobilizem', 'volkswagen', 'bmw', 'audi', 'tesla', 'dizel', 'bencin', 'hibrid',
        'suv', 'limuzina', 'karavan', 'renault', 'toyota', 'peugeot', 'skoda', 'mercedes',
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
        'umetna-inteligenca', 
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
        '/zabava-in-slog/', 'svet-zavoda', 'na-lepse', 'vrt', 'recepti', 'horoskop', 
        '/tv-oddaje/', 'resnicnostni-sov', 'kmetija', 'ljubezen-po-domace', 'sanjski-moski',
        // NOVO: Specifično za primere, ki si jih poslal
        '/znani/', '/osebna-rast/', '/nedeljske-novice/', 
        'senidah', 'koncert', 'stozice', // Pop kultura
        'noseca', 'pricakuje-otroka', 'zvezdnik', 'partner', // Trači
        'custva', 'psihologija', 'sreca', 'odnosi' // Osebna rast
    ]
  },
  {
    id: 'kultura',
    label: 'Kultura',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    keywords: [
        '/kultura/', '/kultur/', 'film', 'glasba', 'knjige', 'razstave', 'gledalisce', 
        'umetnost', 'festival', 'literatura', 'oder', 
        'pisatelj', 'pesnik', 'slikar', 'igralec', 'roman', 'premiera', 'kino'
    ]
  }
]

// 2. LOGIKA ZAZNAVANJA (Prioriteta)
const PRIORITY_CHECK_ORDER: CategoryId[] = [
  'kronika',      // 1.
  'moto',         // 2.
  'magazin',      // 3. POZOR: Magazin je zdaj PRED Športom in Techom! (Da "noseča zvezdnica NFL" gre v Magazin)
  'sport',        // 4.
  'tech',         // 5.
  'gospodarstvo', // 6.
  'kultura',      // 7.
  'svet',         // 8.
  'slovenija'     // 9.
]

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function determineCategory(item: { 
  link: string; 
  title?: string; 
  contentSnippet?: string; 
  categories?: string[] 
}): CategoryId {
  
  const url = item.link.toLowerCase()
  
  // 1. URL check
  for (const id of PRIORITY_CHECK_ORDER) {
    const cat = CATEGORIES.find(c => c.id === id)
    if (cat && cat.keywords.some(k => k.startsWith('/') && url.includes(k))) {
      return cat.id
    }
  }

  // 2. RSS tags check
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

  // 3. Title/Snippet check
  const combinedText = unaccent((item.title || '') + ' ' + (item.contentSnippet || ''))
  for (const id of PRIORITY_CHECK_ORDER) {
    const cat = CATEGORIES.find(c => c.id === id)
    if (cat && cat.keywords.some(k => !k.startsWith('/') && k.length > 3 && combinedText.includes(unaccent(k)))) {
      return cat.id
    }
  }

  return 'ostalo'
}

export function getKeywordsForCategory(catId: string): string[] {
  const cat = CATEGORIES.find(c => c.id === catId)
  return cat ? cat.keywords : []
}
