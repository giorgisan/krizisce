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
        '/slovenija/', '/lokalno/', '/obcine/', '/regije/', '/okolje/', '/lokalne-novice/', '/mnenja/', '/kolumne/',
        'ljubljan', 'maribor', 'celj', 'koper', 'kranj', 'nov mest', 'velenj', 'mursk sobot',
        'vlada', 'parlament', 'poslanc', 'ministr', 'premier', 'predsednik', 'pirc musar', 'golob', 'jansa',
        'referendum', 'anket', 'stavk', 'sindikat', 'zdravstv', 'upokojenc', 'pokojnin', 'minimaln plac',
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
        'zda', 'trump', 'biden', 'harris', 'eu', 'nato', 'hrvask', 'balkan',
        'prehod', 'meja', 'begunec', 'humanitarn', 'rafa', 'plima', 'ciklon'
    ]
  },
  {
    id: 'kronika',
    label: 'Kronika',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    keywords: [
        '/kronika/', '/crna-kronika/', '/crna/',
        'policij', 'policist', 'kriminal', 'gasil', 'reseval', 'pozar', 'nesrec', 'trcenj', 
        'rop', 'vlom', 'umor', 'uboj', 'truplo', 'utonil', 'sodisc', 'zapor', 'goljuf'
    ]
  },
  {
    id: 'sport',
    label: 'Šport',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    keywords: [
        '/sport/', '/sportal/', '/nogomet/', '/kosarka/', '/zimski-sporti/',
        'zmag', 'poraz', 'tekm', 'lig', 'pokal', 'prvenstv', 'trener',
        'smuc', 'skoki', 'planica', 'prevc', 'maze', 'doncic', 'pogacar', 'roglic',
        'drsalk', 'led', 'olimpijsk'
    ]
  },
  {
    id: 'posel-tech',
    label: 'Posel & Tech',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: [
        '/gospodarstvo/', '/posel/', '/finance/', '/tech/', '/znanost/', '/digisvet/', '/zaposlitev/',
        'delnic', 'kripto', 'bitcoin', 'inflacij', 'banka', 'davk', 'bdp', 'podjet', 'zaposlen', 
        'siht', 'placa', 'poklic', 'studira', 'umetn inteligenc', 'chatgpt', 'digitaln'
    ]
  },
  {
    id: 'moto',
    label: 'Mobilnost', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    keywords: [
        '/auto/', '/avto/', '/avtomoto/', '/avtomobilno/', '/mobilnost/', '/svet-vozil/',
        'vozil', 'model', 'test', 'tesla', 'bmw', 'audi', 'mercedes', 'volkswagen',
        'avtomobil', 'suv', 'pnevmatik', 'dars', 'vinjet', 'avtocest'
    ]
  },
  {
    id: 'magazin',
    label: 'Magazin',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    keywords: [
        '/magazin/', '/scena/', '/zvezde/', '/zabava/', '/bulvar/', '/znani/', '/trendi/', '/vip/', 
        '/zvezde-in-slavni/', '/zanimivosti/', '/popin/', '/karikatura/', '/zabava-in-slog/', '/ljudje/', '/traci/',
        'kardashian', 'kraljev', 'harry', 'meghan', 'severin', 'estradnik', 'zaroc', 'samsk', 'ločit',
        'poroka', 'nosecnost', 'horoskop', 'astro', 'film', 'netflix', 'viral', 'sreca', 'zadel', 'milijon', 'kviz', 'posnetek'
    ]
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    keywords: [
        '/zdravje/', '/okusno/', '/kulinarika/', '/lifestyle/', '/dom/', '/bivanje/', '/gospodinjstvo/', 
        '/gradnja-obnova/', '/aktivni-in-zdravi/', '/osebna-rast/', '/stil/', '/zivljenje/', '/vrt/', '/polet/', '/mama/',
        'bolezen', 'simptom', 'zdravnik', 'rak', 'srce', 'recept', 'hran', 'meso', 'kroznik',
        'gradn', 'hise', 'nozev', 'nozi', 'skreg', 'prepir', 'pijac', 'hidraci', 'hladilnik', 
        'ciscen', 'vzigalic', 'stranisc', 'pustn', 'meduz', 'kamel', 'samostan', 'vnuk', 'babic', 'dedk'
    ]
  },
  {
    id: 'kultura',
    label: 'Kultura',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    keywords: [
        '/kultura/', '/umetnost/', '/knjige/', '/film/', '/glasba/', '/gledalisce/', '/mlado-pero/',
        'razstav', 'muzej', 'galerij', 'umetnik', 'koncert', 'opera', 'balet',
        'knjizn', 'pisatelj', 'pesnik', 'roman', 'slovenscin', 'jezik'
    ]
  }
]

// Prioriteta: Če sta dve kategoriji izenačeni, zmagajo tiste bolj specifične.
const PRIORITY_CHECK_ORDER: CategoryId[] = [
  'kronika', 'sport', 'moto', 'posel-tech', 'kultura', 'lifestyle', 'svet', 'slovenija', 'magazin'
];

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function determineCategory(item: { 
  link: string; 
  title?: string; 
  contentSnippet?: string; 
  categories?: string[];
  keywords?: string[]; 
}): CategoryId {
  
  const url = item.link.toLowerCase();
  
  // 1. DINAMIČNI EARLY EXIT (Poglej če URL rubrika točno ustreza kateri kategoriji)
  // Gremo čez prioriteto rubrik (najprej preverimo specifične, nato splošne kot je magazin/svet)
  const earlyExitOrder: CategoryId[] = ['moto', 'lifestyle', 'posel-tech', 'kronika', 'sport', 'kultura', 'magazin', 'svet'];
  for (const catId of earlyExitOrder) {
    const cat = CATEGORIES.find(c => c.id === catId);
    if (cat && cat.keywords.some(kw => kw.startsWith('/') && url.includes(kw))) {
      return catId;
    }
  }

  // 2. TOČKOVANJE (Če URL ni bil odločilen, prečešemo besedilo)
  const scores: Record<CategoryId, number> = {
    slovenija: 0, svet: 0, kronika: 0, sport: 0, magazin: 0,
    lifestyle: 0, 'posel-tech': 0, moto: 0, kultura: 0, oglas: 0, ostalo: 0
  };

  const title = unaccent(item.title || '');
  const combined = unaccent(title + ' ' + (item.contentSnippet || ''));

  for (const cat of CATEGORIES) {
      for (const kw of cat.keywords) {
          if (kw.startsWith('/')) continue; 
          const cleanKw = unaccent(kw);
          if (title.includes(cleanKw)) {
              scores[cat.id] += 3; // Beseda v naslovu šteje več
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

  // 3. POSEBEN HINT ZA SLOVENIJO (Lokalne novice)
  if (url.includes('/slovenija/') || url.includes('/lokalno/')) {
      return maxScore > 2 ? bestCategory : 'slovenija';
  }

  return maxScore > 0 ? bestCategory : 'ostalo';
}
