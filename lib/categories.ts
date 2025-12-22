// lib/categories.ts

export type CategoryId = 
  | 'slovenija' 
  | 'svet' 
  | 'kronika' 
  | 'sport' 
  | 'magazin'       
  | 'lifestyle'     // NOVO: Ločeno od Magazina (Zdravje, Dom, Recepti)
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
        '/slovenija/', '/lokalno/', '/obcine/', '/volitve/', 'vlada', 'poslanci', 
        '/novice/slovenija/', 'domovina', 'notranja-politika',
        'ljubljana', 'maribor', 'celje', 'koper', 'kranj', 'novo-mesto', 'velenje', 'vrhnika', 'postojna', 'kocevje', 'ptuj',
        'regije', 'slovenij', '/lokalne-novice/', '/stajerska/', '/dolenjska/', '/primorska/', '/gorenjska/', '/prekmurje/', '/koroska/',
        '/mnenja/', '/pisma-bralcev/', '/sobotna-priloga/', '/kolumne/', '/bralci/',
        '/karikatura/', '/stevilke/', 
        'javna-uprava', 'drzavni-zbor', 'zupan', 'obcina', 'studentski-dom', 'fakultet',
        'prenova', 'gradnja', 'vodovod', 'vrtec', 'sola', 'cesta', 'zeleznica', 'drugi-tir', 'prometna-infrastruktura',
        'humanitarn', 'nvo', 'protest', 'stavka', 'sindikat', 'rasizem', 'diskriminacija', 'hostel', 'turist',
        'vlak', 'potniki', 'zeleznis', 'tir', 'sz', 'zeleznice', 'avtobus', 'lpp',
        'vreme', 'arso', 'vremenska', 'sneg', 'dezevje', 'poplave', 'neurje', 'toča', 'ciklon', 'temperatura', 'prognostik',
        'dobrodeln', 'zbiranje pomoci', 'pomoc', 'gasilska zveza',
        
        // POLITIKA (DODANO na podlagi tvojih primerov):
        'pirc musar', 'golob', 'narodna enotnost', 'osebnost leta', 'predsednica',
        'gibanje svoboda', 'sds', 'nsi', 'stranka', 'resni.ca', 'zoran stevanovic', 'levica', 'sd',
        'anketa', 'javnomnenjsk', 'podpora vladi', 'upokojenc', 'pokojnin', 'zpis'
    ]
  },
  {
    id: 'svet',
    label: 'Svet',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    keywords: [
        '/svet/', '/tujina/', '/evropa/', '/zda/', 'ukrajina', 'rusija', 'vojna', 'nato', 'trump', 
        '/novice/svet/', 'zunanja-politika', 'eu', 'bliznji-vzhod', 'gaza', 'izrael',
        'evropska-unija', 'evropski-parlament', 'scholz', 'macron', 'biden', 'putin', 'zelenski', 'von der leyen',
        'kitajska', 'indija', 'iran', 'severna koreja', 'spopad', 'geopolitika',
        'bela hisa', 'white house',
        'melania', 'vance', 'kamala', 'republikan', 'demokrat',
        'epstein', 'albanij', 'nemcij', 'zavetisc' 
    ]
  },
  {
    id: 'kronika',
    label: 'Kronika',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    keywords: [
        '/kronika/', '/crna-kronika/', 'policija', 'gasilci', 'nesreca', 'umor', 'sodisce', 
        'kriminal', 'tragicno', 'sojenje', 'napad', 'rop', 'ukradla', 'zapornik', 'zapor', 
        'panika', 'pretep', 'droge', 'kokain', 'mamil', 'tihotap', 'aretacija', 'trcenje', 'smrt',
        'pu ljubljana', 'pu maribor', 'pu celje', 'pu kranj', 'pu koper', 'pu novo mesto',
        'gorska resevalna', 'resevalci', 'intervencija', 'pozar', 'utonil', 'truplo',
        'pripor', 'privedli', 'zasegli', 'preiskava', 'osumljenci', 'krivda', 'obtozba',
        'pijan', 'vinjen', 'alkoholiziran', 'nadlegoval', 'krsitev', 'javni red', 'mir', 
        'nasilje', 'prekrsek', 'krical', 'razgrajal',
        // DODANO:
        'petarda', 'pirotehnik', 'eksplozij', 'poskodba'
    ]
  },
  {
    id: 'sport',
    label: 'Šport',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    keywords: [
        '/sport/', '/sportal/', '/sport-', 
        'nogomet', 'kosarka', 'zimski', 'atletika', 'kolesarstvo', 'tenis', 
        'ekipa24', 'sport.n1info.si', 'odbojka', 'rokomet', 'nhl', 'nba', 'doncic', 'kopitar', 
        'pogacar', 'roglic', 'messi', 'olimpij', 'liga', 'prvenstvo', 'trener', 'reprezentanca', 'tekma',
        'bayern', 'munchen', 'real madrid', 'barcelona', 'juventus', 'planica', 'skoki', 'alpsko smucanje',
        'smucanje', 'ilka stuhec', 'zlatko zahovic', 'kek', 'ceferin', 'uefa', 'fifa', 'streljal', 'zadetki'
    ]
  },
  {
    id: 'lifestyle',
    label: 'Življenjski slog',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    keywords: [
        // SPLOŠNO
        '/lifestyle/', '/zdravje/', '/lepota/', '/odnosi/', '/bivanje/', '/kulinarika/', '/okusno/',
        '/dom-in-vrt/', '/potovanja/', '/ture-avanture/', '/dobro-pocutje/', '/slog/',
        
        // HRANA & RECEPTI
        'recept', 'kuhinja', 'kuhar', 'kosilo', 'sladica', 'pecivo', 'torta', 'potica', 'piškoti',
        'jedilnik', 'prehrana', 'zivilo', 'sestavin', 'glavna jed', 'zajtrk', 'vecerja',
        'kislo zelje', 'matevz', 'pečenka', 'grah', 'zelenjava', 'sadje', 'meso',
        
        // ZDRAVJE & WELLNESS (Pokrije tvoj primer s spancem)
        'zdravnik', 'medicina', 'bolniska', 'srce', 'jetra', 'mineral', 'vitamin',
        'bakterij', 'prebav', 'kosti', 'repa', 'rak ', 'simptomi', 'bolecine', 'imunski sistem',
        'holesterol', 'krvni tlak', 'sladkorna', 'dieta', 'hujsanje', 'vadba', 'kalorije',
        'savna', 'wellness', 'spa', 'masaza', 'okrevanje', 'kap ', 'mozganska',
        'spanec', 'spanje', 'telesna aktivnost', 'studija',
        
        // DOM & VRT & OBIČAJI (Pokrije blagoslov doma)
        '/dom/', '/dekor/', 'gospodinjstvo', 'gradnja-obnova', 'pod-streho',
        'vrtnarjenje', 'ciscenje', 'madezi', 'triki', 'interier', 'arhitektura', 'prenova doma',
        'bozic', 'prazniki', 'darila', 'jelka', 'okraski', 'advent', 'nakupovanje',
        'blagoslov', 'tradicij', 'navad', 'hisa', 'hise', 'hisah', 'montazn', 'lumar', 'novogradnj', 'nepremicnin'
    ]
  },
  {
    id: 'posel-tech',
    label: 'Posel & Tehnologija',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: [
        // GOSPODARSTVO
        '/gospodarstvo/', '/posel/', '/finance/', '/borza/', 'kripto', 'delnice', 'podjetnistvo', 
        '/posel-danes/', 'banke', 'druzbe', 'gospodarstvo', 'inflacija', 'bitcoin', 'evro', 
        'zaposlitev', 'sluzba', 'odpustili', 'delavec', 'poklic', 'podjetje', 'direktor', 'stecaj',
        'energetika', 'elektrika', 'podrazitev', 'mastercard', 'nlb', 'prihodki', 'dobicek', 'izguba',
        'bdp', 'obrestne mere', 'ecb', 'lagarde', 'nafta', 'plin', 'nepremicnine', 'stanovanja',
        'zavarovanje', 'prispevki', 'davki', 'furs', 'evrov', 'evra', 'cena', 'stroski', 'draginja',
        
        // TECH & TELEFONI (Pokrije tvoj Honor primer)
        '/znanoteh/', '/znanost/', '/tehnologija/', '/tech/', '/digisvet/', 
        'vesolje', 'telefoni', 'racunalnistvo', 'pametni', 
        'umetna-inteligenca', 'ai', 'kriptovalute', 'recenzija', 'test',
        'apple', 'samsung', 'google', 'microsoft', 'nvidia', 'chatgpt', 'openai', 'xiaomi', 'huawei', 'honor',
        'inovacije', 'razvoj', 'digitalno', 'nasa', 'spacex', 'astronomija', 'mars', 'rover', 'aplikacija', 
        'internet', 'android', 'ios', 'windows', 'linux', 'robotika'
    ]
  },
  {
    id: 'moto',
    label: 'Mobilnost', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    keywords: [
        '/auto/', '/avto/', '/avtomobilnost/', '/avtomobilno/', '/avtomoto/', '/svet-vozil/',        
        '/mobilnost/', '/motociklizem/', '/avtomotosport/', 
        'vozila', 'promet', 'elektricna-vozila', 'testi', 
        'avtomobilizem', 'volkswagen', 'bmw', 'audi', 'tesla', 'dizel', 'bencin', 'hibrid',
        'suv', 'limuzina', 'karavan', 'renault', 'toyota', 'peugeot', 'skoda', 'mercedes', 'porsche', 'volvo', 'fiat',
        'cupra', 'geely', 'byd', 'mazda', 'lexus', 'citroen', 'kia ', 'ford', 'opel',
        'formula-1', 'f1', 'verstappen', 'hamilton', 'rally', 'moto-gp', 'dirka', 
        'motorji', 'zgorevanjem', 'avtomobilska-industrija', 'vinjeta', 'dars', 'cestnina', 'predor',
        'kazen', 'kazni', 'globa'
    ]
  },
  {
    id: 'magazin',
    label: 'Magazin',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    keywords: [
        '/magazin/', '/popin/', '/trendi/', '/scena/', '/zvezde/', '/zabava/', '/traci/',
        '/svet-znanih/', '/bulvar/', '/tuji-traci/', '/domaci-traci/', '/ljudje/',
        '/spotkast/', 'suzy', 'lady', '/nedelo/', '/pop-30/',
        'zvezdnik', 'vplivnez', 'znani', 'slavni', 'koncert', 'nastop', 'spektakel',
        'senidah', 'joker out', 'evrovizij', 'ema', 'talent',
        'jagger', 'jackson', 'kardashian', 'kraljeva', 'princ', 'harry', 'meghan',
        'gaber', 'partner', 'ločitev', 'razhod', 'poroka', 'noseca', 'otrok',
        'horoskop', 'znamenje', 'astro', 'zodiak',
        'resnicnostni', 'kmetija', 'sanjski', 'ljubezen po domace', 'poroka na prvi',
        'viral', 'video', 'foto', 'posnetek', 'sokantno', 'ganljivo', 'presenečenje'
    ]
  },
  {
    id: 'kultura',
    label: 'Kultura',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    keywords: [
        '/kultura/', '/kultur/', 'film', 'glasba', 'knjige', 'razstave', 'gledalisce', 
        'umetnost', 'festival', 'literatura', 'oder', 
        'pisatelj', 'pesnik', 'slikar', 'igralec', 'premiera', 'kino',
        'bralne-urice', 'dokumentarni-film', 'reziser',
        'muzej', 'dediscina', 'zgodovina', 'orkester', 'koncert', 'opera', 'balet',
        'knjizni-sejem', 'liffe', 'animateka', 'oskarji', 'grammy', 'cankarjev dom',
        'zgodovinar', 'zgodovinarka',
        'beseda leta', 'zrc sazu', 'jezik'
    ]
  }
]

// --- VRSTNI RED PREVERJANJA URL-JEV ---
// Magazin in Lifestyle sta na koncu, da resne novice (Tech, Svet) ne "padejo" tja
const PRIORITY_CHECK_ORDER: CategoryId[] = [
  'sport',        // 1.
  'moto',         // 2.
  'posel-tech',   // 3. (Telefoni, Cene)
  'svet',         // 4.
  'kronika',      // 5. (Petarde, nesreče)
  'kultura',      // 6.
  'slovenija',    // 7. (Politika, lokalno)
  'lifestyle',    // 8. (Recepti, zdravje)
  'magazin'       // 9. (Trači, horoskop)
]

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function determineCategory(item: { 
  link: string; 
  title?: string; 
  contentSnippet?: string; 
  categories?: string[] 
}): CategoryId {
  
  const url = item.link.toLowerCase()
  
  // 1. URL CHECK
  for (const id of PRIORITY_CHECK_ORDER) {
    const cat = CATEGORIES.find(c => c.id === id)
    if (cat && cat.keywords.some(k => k.startsWith('/') && url.includes(k))) {
      return cat.id
    }
  }

  // 2. RSS TAGS CHECK
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

  // 3. TITLE/SNIPPET CHECK
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
