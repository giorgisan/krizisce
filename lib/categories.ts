// lib/categories.ts

export type CategoryId = 
  | 'slovenija' 
  | 'svet' 
  | 'kronika' 
  | 'sport' 
  | 'magazin'        
  | 'lifestyle'      
  | 'posel-tech'     
  | 'moto'             
  | 'kultura'
  | 'oglas' 
  | 'ostalo'

export type CategoryDef = {
  id: CategoryId
  label: string
  color: string 
  keywords: string[] 
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'slovenija',
    label: 'Slovenija',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    keywords: [
        '/slovenija/', '/lokalno/', '/obcine/', '/regije/', '/okolje/', 
        'ljubljan', 'maribor', 'celj', 'koper', 'kranj', 'nov mest', 'velenj',
        'vlada', 'parlament', 'poslanc', 'ministr', 'premier', 'predsednik',
        'pirc musar', 'golob', 'jansa', 'tonin', 'mesec', 'fajon', 'logar', 
        'svoboda', 'sds', 'nsi', 'levica', 'sd', 'referendum', 'anket',
        'upokojenc', 'pokojnin', 'minimaln plac', 'stavk', 'sindikat',
        'vreme', 'arso', 'napoved', 'sneg', 'dez', 'neurj', 'poplav', 'rekord'
    ]
  },
  {
    id: 'svet',
    label: 'Svet',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    keywords: [
        '/svet/', '/tujina/', '/evropa/', '/globalno/',
        'ukrajin', 'rusij', 'putin', 'zelensk', 'kijev', 'moskv', 'vojn', 'obroz',
        'gaza', 'izrael', 'palestin', 'hamas', 'netanjahu', 'bliznj vzhod',
        'zda', 'bela hisa', 'trump', 'biden', 'harris', 'eu', 'nato',
        'vucic', 'plenkovic', 'hrvask', 'zagreb', 'beograd', 'balkan',
        'prehod', 'meja', 'begunec', 'humanitarn', 'rafa', 'plima', 'ciklon'
    ]
  },
  {
    id: 'kronika',
    label: 'Kronika',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    keywords: [
        '/kronika/', '/crna-kronika/', 
        'policij', 'policist', 'pu ', 'kriminal', 'gasil', 'reseval',
        'pozar', 'intervencij', 'nesrec', 'trcenj', 'rop', 'vlom', 'umor', 'uboj',
        'truplo', 'utonil', 'sodisc', 'zapor', 'goljuf'
    ]
  },
  {
    id: 'sport',
    label: 'Šport',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    keywords: [
        '/sport/', '/sportal/', 
        'zmag', 'poraz', 'tekm', 'lig', 'pokal', 'prvenstv', 'trener',
        'smuc', 'skoki', 'planica', 'kranjska gora', 'prevc', 'maz', 'maze',
        'nogomet', 'maribor', 'olimpija', 'kosarka', 'nba', 'doncic', 'pogacar',
        'drsalk', 'led', 'olimpijsk'
    ]
  },
  {
    id: 'posel-tech',
    label: 'Posel & Tech',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: [
        '/gospodarstvo/', '/posel/', '/finance/', '/tech/', '/digisvet/',
        'delnic', 'kripto', 'bitcoin', 'ethereum', 'inflacij', 'banka',
        'davk', 'furs', 'bdp', 'podjet', 'zaposlitev', 'plac', 'siht',
        'umetn inteligenc', 'chatgpt', 'openai', 'digitaln', 'omrez'
    ]
  },
  {
    id: 'moto',
    label: 'Mobilnost', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    keywords: [
        '/auto/', '/avto/', '/avtomoto/', '/avtomobilno/', '/mobilnost/',
        'vozil', 'model', 'test', 'tesla', 'bmw', 'audi', 'mercedes',
        'suv', 'pnevmatik', 'dars', 'vinjet', 'avtocest'
    ]
  },
  {
    id: 'magazin',
    label: 'Magazin',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    keywords: [
        '/magazin/', '/scena/', '/zvezde/', '/zabava/', '/bulvar/', '/znani/',
        'kardashian', 'kraljev', 'harry', 'meghan', 'severin', 'zvezdnik',
        'poroka', 'nosecnost', 'horoskop', 'astro', 'film', 'netflix', 'viral'
    ]
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    keywords: [
        '/zdravje/', '/okusno/', '/kulinarika/', '/dom/', '/bivanje/',
        'bolezen', 'simptom', 'zdravnik', 'rak', 'srce', 'diabetes',
        'recept', 'kosilo', 'vecerja', 'hran', 'okus', 'meso', 'kroznik',
        'vrt', 'rastlin', 'hlaca', 'hlacn', 'nogavic', 'srcni spodbujevalnik'
    ]
  },
  {
    id: 'kultura',
    label: 'Kultura',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    keywords: [
        '/kultura/', '/umetnost/', '/knjige/', '/glasba/',
        'razstav', 'muzej', 'galerij', 'umetnik', 'koncert', 'opera',
        'knjizn', 'pisatelj', 'pesnik', 'roman', 'slovenscin', 'jezik'
    ]
  }
]

// VRSTNI RED PREDNOSTI: Najprej specifične novice, Magazin čisto na koncu!
const PRIORITY_CHECK_ORDER: CategoryId[] = [
  'kronika',
  'sport',
  'moto',
  'posel-tech',
  'kultura',
  'lifestyle',
  'svet',
  'slovenija',
  'magazin', 
]

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function determineCategory(item: { 
  link: string; 
  title?: string; 
  contentSnippet?: string; 
  categories?: string[];
  keywords?: string[]; 
}): CategoryId {
  
  const url = item.link.toLowerCase();
  
  // 1. DOLOČILNA PRAVILA (Early Exit)
  // Če povezava vsebuje te rubrike, se sploh ne sprašujemo dalje.
  if (url.includes('/svet/') || url.includes('/tujina/')) return 'svet';
  if (url.includes('/kronika/') || url.includes('/crna-kronika/')) return 'kronika';
  if (url.includes('/sport/') || url.includes('/sportal/')) return 'sport';
  if (url.includes('/avtomobilno/') || url.includes('/avto/')) return 'moto';
  if (url.includes('/gospodarstvo/') || url.includes('/posel/')) return 'posel-tech';
  if (url.includes('/kultura/')) return 'kultura';
  if (url.includes('/zdravje/') || url.includes('/kulinarika/')) return 'lifestyle';
  
  // Šele če nič od zgornjega ne drži, gremo v točkovanje
  const scores: Record<CategoryId, number> = {
    slovenija: 0, svet: 0, kronika: 0, sport: 0, magazin: 0,
    lifestyle: 0, 'posel-tech': 0, moto: 0, kultura: 0, oglas: 0, ostalo: 0
  };

  const title = unaccent(item.title || '');
  const combined = unaccent(title + ' ' + (item.contentSnippet || ''));
  const tokens = combined.split(/\s+/).filter(w => w.length > 3);

  // Točkovanje
  for (const cat of CATEGORIES) {
      for (const kw of cat.keywords) {
          if (kw.startsWith('/')) continue;
          const cleanKw = unaccent(kw);
          if (title.includes(cleanKw)) {
              scores[cat.id] += 3; // Naslov ima večjo težo
          } else if (combined.includes(cleanKw)) {
              scores[cat.id] += 1;
          }
      }
  }

  let maxScore = 0;
  let bestCategory: CategoryId = 'ostalo';

  for (const id of PRIORITY_CHECK_ORDER) {
      if (scores[id] > maxScore) {
          maxScore = scores[id];
          bestCategory = id;
      }
  }

  // Če imamo URL hint za Slovenijo, ga uporabimo le, če ni močnejših zadetkov
  if (url.includes('/slovenija/') || url.includes('/lokalno/')) {
      return maxScore > 2 ? bestCategory : 'slovenija';
  }

  return maxScore > 0 ? bestCategory : 'ostalo';
}
