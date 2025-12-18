// lib/categories.ts

export type CategoryId = 
  | 'slovenija' 
  | 'svet' 
  | 'kronika' 
  | 'sport' 
  | 'magazin'       
  | 'posel-tech'    // ZDRUŽENO: Gospodarstvo + Tech
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
        '/karikatura/', 
        'javna-uprava', 'drzavni-zbor', 'zupan', 'obcina', 'studentski-dom', 'fakultet',
        'prenova', 'gradnja', 'vodovod', 'vrtec', 'sola', 'cesta', 'zeleznica', 'drugi-tir', 'prometna-infrastruktura',
        'humanitarn', 'nvo', 'protest', 'stavka', 'sindikat', 'rasizem', 'diskriminacija', 'hostel', 'turist',
        'vlak', 'potniki', 'zeleznis', 'tir', 'sz', 'zeleznice', 'avtobus', 'lpp',
        'vreme', 'arso', 'vremenska', 'sneg', 'dezevje', 'poplave', 'neurje', 'toča', 'ciklon', 'temperatura', 'prognostik',
        'dobrodeln', 'zbiranje pomoci', 'pomoc'
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
        'bela hisa', 'white house'
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
        'pripor', 'privedli', 'zasegli', 'preiskava', 'osumljenci', 'krivda', 'obtozba'
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
    id: 'magazin',
    label: 'Magazin',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    keywords: [
        '/magazin/', '/popin/', '/trendi/', '/scena/', '/zvezde/', '/zabava/', 
        '/lifestyle/', '/kulinarika/', '/okusno/', '/astro/', 'suzy', 'lady', 'dom-in-vrt',
        '/nedeljski/', '/zdravje/', '/lepota/', '/odnosi/', '/bivanje/', '/zanimivosti/', '/duhovnost/',
        '/nedelo/', '/pop-30/',
        // ZDRAVJE in WELLNESS
        'zdravje', 'bolezen', 'ambulanta', 'zdravnik', 'medicina', 'bolniska', 'zdravstvo', 'srce', 'jetra', 'mineral', 'vitamin',
        'bakterij', 'prebav', 'kosti', 'zivilo', 'repa', 'superzelenjava', 'rak ', 'simptomi', 'bolecine', 'imunski sistem',
        'holesterol', 'krvni tlak', 'sladkorna', 'dieta', 'hujsanje', 'vadba', 'recept', 'kalorije',
        'savna', 'wellness', 'spa', 'masaza',
        // LIFESTYLE
        'prosti-cas', 'nedeljski', 'izleti', 'dobro-pocutje', '/ture-avanture/',
        '/bulvar/', '/tuji-traci/', '/domaci-traci/', '/ljudje/', '/stil/', 
        '/zabava-in-slog/', 'svet-zavoda', 'na-lepse', 'vrt', 'recepti', 'horoskop', 
        'zodiak', 'znamenje',
        '/tv-oddaje/', 'resnicnostni-sov', 'kmetija', 'ljubezen-po-domace', 'sanjski-moski', 'poroka-na-prvi-pogled', 'slovenija-ima-talent',
        '/znani/', '/osebna-rast/', '/nedeljske-novice/', '/lepota-bivanja/', '/napovedujemo/',
        'senidah', 'koncert', 'stozice', 'evrovizij', 'ema',
        'noseca', 'pricakuje-otroka', 'zvezdnik', 'partner', 'poroka', 'locitev',
        'custva', 'psihologija', 'sreca', 'odnosi', 'seks', 'ljubezen',
        'nostalgija', 'spomini', 'obletnica',
        '/dom/', '/dekor/', '/gospodinjstvo/', '/gradnja-obnova/', '/pod-streho/',
        'kosilo', 'sladica', 'kuhar', 'jedilnik', 'prehrana', 
        'potovanje', 'izlet', 'popotnik', 'dozivetje', 'turist',
        'gradnja', 'hisna', 'vrtnarjenje', 'ciscenje', 'madezi', 'triki',
        'bozic', 'prazniki', 'darila', 'jelka', 'okraski', 'advent',
        'vplivnez', 'moda', 'lepota', 'manekenka', 'kraljeva',
        'viral', 'posnetek', 
        'upokojen', 'senior', 'starost',
        'coach', 'trener', 'cilj', 'motivacija', 'uspeh', 'karier',
        'navdih', 'zadovoljstvo', 'nasvet',
        'nakup', 'trgovin', 'obdarovanje', 'darilo', 'stres', 'praznicn',
        'interier', 'arhitektura'
    ]
  },
  {
    id: 'posel-tech',
    label: 'Posel & Tehnologija', // ZDRUŽENO
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: [
        // GOSPODARSTVO KEYWORDS
        '/gospodarstvo/', '/posel/', '/finance/', '/borza/', 'kripto', 'delnice', 'podjetnistvo', 
        '/posel-danes/',
        'banke', 'druzbe', 'posel-danes', 'gospodarstvo', 'inflacija', 'bitcoin', 'evro', 
        'zaposlitev', 'sluzba', 'odpustili', 'delavec', 'poklic', 'podjetje', 'direktor', 'stecaj',
        'energetika', 'elektrika', 'podrazitev', 'mastercard', 'nlb', 'prihodki', 'dobicek', 'izguba',
        'bdp', 'obrestne mere', 'ecb', 'lagarde', 'nafta', 'plin', 'nepremicnine', 'stanovanja',
        'pokojnina', 'upokojenec', 'delovna doba', 'zpis', 'pravni nasvet', 'zavarovanje', 'prispevki',
        'hse', 'elektrarn', 'termoelektrarn', 'premog', 'rudarjenje', 'letalsk', 'letalisce', 'brnik', 'adria', 'lufthansa', 'eurowings',
        
        // TECH KEYWORDS (PRIKLJUČENO TUKAJ)
        '/znanoteh/', 
        '/znanost/', '/tehnologija/', '/tech/', '/digisvet/', '/znanost-in-tehnologija/', '/digitalna-odpornost/',
        'vesolje', 'telefoni', 'racunalnistvo', 'pametni', 
        'umetna-inteligenca', 'ai', 'kriptovalute',
        'apple', 'samsung', 'google', 'microsoft', 'nvidia', 'chatgpt', 'openai', 'xiaomi', 'huawei',
        'inovacije', 'razvoj', 'digitalno', 'nasa', 'spacex', 'astronomija', 'mars', 'rover', 'komet',
        'aplikacija', 'internet', 'kibernet', 'android', 'ios', 'windows', 'linux', 'robotika',
        'dinozaver', 'pterozaver', 'fosil', 'odkritje', 'vrsta', 'znanoteh', 'dnk', 'genetika'
    ]
  },
  {
    id: 'moto',
    label: 'Mobilnost', // Malenkost preimenovano za jasnost
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    keywords: [
        '/auto/', '/avto/', 
        '/avtomobilnost/', '/avtomobilno/', '/avtomoto/', '/svet-vozil/',        
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
        'zgodovinar', 'zgodovinarka'
    ]
  }
]

// --- POMEMBNO: VRSTNI RED PREVERJANJA URL-JEV ---
// Tukaj določamo prioriteto.
// "Posel & Tech" mora biti visoko, da ujame npr. "Tech" članke pred "Svet".
export const PRIORITY_CHECK_ORDER: CategoryId[] = [
  'sport',        // 1. ŠPORT (Pogačar ima prednost pred vsem)
  'kronika',      // 2. KRONIKA (Jasna ključna beseda)
  'moto',         // 3. AVTO-MOTO
  'kultura',      // 4. KULTURA
  'magazin',      // 5. MAGAZIN (Vsebuje horoskop, trače, zdravje)
  'posel-tech',   // 6. POSEL & TECH (Vsebuje tudi znanost)
  'svet',         // 7. SVET
  'slovenija'     // 8. SLOVENIJA (Fallback za vse ostalo lokalno)
]

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function determineCategory(item: { 
  link: string; 
  title?: string; 
  contentSnippet?: string; 
  categories?: string[] 
}): CategoryId {
  
  const url = item.link.toLowerCase()
  
  // 1. URL CHECK (ABSOLUTNA PRIORITETA)
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
         // Očistimo keyword (odstranimo slashe za RSS check)
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
    // Pazimo, da ne matchamo kratkih besed ali slash keywordov v navadnem tekstu
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
