export type CategoryId = 
  | 'sport' 
  | 'magazin' 
  | 'kronika' 
  | 'tech' 
  | 'gospodarstvo' 
  | 'kultura' 
  | 'slovenija' 
  | 'svet' 
  | 'ostalo'

export type CategoryDef = {
  id: CategoryId
  label: string
  color: string 
  keywords: string[] 
}

// VRSTNI RED JE KLJUČEN! 
// Najprej preverimo zelo specifične (Šport, Magazin), šele na koncu splošne (Svet).
export const CATEGORIES: CategoryDef[] = [
  {
    id: 'sport',
    label: 'Šport',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    keywords: [
      '/sport/', '/sportal', '/sportal/', 'ekipa24', 'nogomania', 'ligaprvakov', 
      'f1', 'moto', 'zimski-sporti', 'kosarka', 'nogomet', 'tenis', 'kolesarstvo',
      'sport.n1info.si'
    ]
  },
  {
    id: 'magazin',
    label: 'Magazin',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    keywords: [
      '/magazin/', '/popin/', '/trendi/', '/zabava-in-slog/', '/scena/', '/zvezde/', 
      '/lifestyle/', '/lepota/', '/zdravje/', '/kulinarika/', '/okusno/', 
      '/tv-sovo/', '/dom-in-vrt/', '/stil/', '/astro/', '/lady/', '/bulvar/',
      'slovenskenovice.si/suzy'
    ]
  },
  {
    id: 'tech',
    label: 'Znanost in tehnologija',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    keywords: [
      '/znanost-in-tehnologija/', '/digisvet/', '/avtomoto/', '/avto/', '/mobilnost/', 
      '/tech/', '/znanost/', '/vesolje/', '/telekomunikacije/', '/racunalnistvo/',
      'racunalniske-novice', 'monitor.si', '/cekin/uporabno/'
    ]
  },
  {
    id: 'kronika',
    label: 'Črna kronika',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    keywords: [
      '/crna-kronika/', '/kronika/', 'policija', 'gasilci', 'nesreca', 'umor', 'sojenje'
    ]
  },
  {
    id: 'kultura',
    label: 'Kultura',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    keywords: [
      '/kultura/', '/razstave/', '/knjige/', '/glasba/', '/film/', '/gledalisce/', '/umetnost/'
    ]
  },
  {
    id: 'gospodarstvo',
    label: 'Gospodarstvo',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: [
      '/gospodarstvo/', '/posel-danes/', '/posel/', '/finance/', '/borza/', '/kripto/', 
      '/podjetnistvo/', '/novice/posel/', 'bloomberg', 'delnice'
    ]
  },
  // SPLOŠNE KATEGORIJE NA KONCU
  {
    id: 'slovenija',
    label: 'Slovenija',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    keywords: [
      '/slovenija/', '/novice/slovenija/', '/lokalno/', '/obcine/', '/volitve/'
    ]
  },
  {
    id: 'svet',
    label: 'Svet',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    keywords: [
      '/svet/', '/tujina/', '/novice/svet/', '/evropa/', '/zda/', '/balkan/'
    ]
  }
]

export function determineCategory(item: { link: string; categories?: string[] }): CategoryId {
  const url = item.link.toLowerCase()
  
  // 1. Prioriteta: Preveri URL segmente
  for (const cat of CATEGORIES) {
    if (cat.keywords.some(k => url.includes(k))) {
      return cat.id
    }
  }

  // 2. Fallback (če URL ne pove ničesar, pustimo "ostalo" ali pa dodelimo splošno)
  // Če je vir recimo "Siol", a nima /sportal/ ali /trendi/, je verjetno "Novice".
  // Zaenkrat vrnemo ostalo, da ne mešamo.
  return 'ostalo'
}

// Pomožna funkcija za API (Search)
export function getKeywordsForCategory(catId: string): string[] {
  const cat = CATEGORIES.find(c => c.id === catId)
  return cat ? cat.keywords : []
}
