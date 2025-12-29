// lib/categories.ts

export type CategoryId = 
  | 'slovenija' 
  | 'svet' 
  | 'kronika' 
  | 'sport' 
  | 'magazin'       
  | 'lifestyle'     // Zdravje, Dom, Kulinarika, Potovanja, Psihologija, Živali
  | 'posel-tech'    // Gospodarstvo + Tehnologija
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
        '/slovenija/', '/lokalno/', '/obcine/', '/regije/', '/lokalne-novice/',
        'ljubljana', 'maribor', 'celje', 'koper', 'kranj', 'novo mesto', 'velenje', 'nova gorica', 'ptuj', 'murska sobota',
        '/stajerska/', '/dolenjska/', '/primorska/', '/gorenjska/', '/prekmurje/', '/koroska/', '/zasavje/', '/posavje/',
        'obcina', 'zupan', 'obcinski svet', 'komunala', 'vodovod', 'kanalizacija', 'ceste', 'prenova',
        
        '/volitve/', 'vlada', 'parlament', 'drzavni zbor', 'poslanci', 'ministrstvo', 'minister', 'premier',
        'pirc musar', 'golob', 'jansa', 'tonin', 'mesec', 'fajon', 'logar', 
        'gibanje svoboda', 'sds', 'nsi', 'levica', 'sd', 'resni.ca', 'pirati', 'vesna',
        'referendum', 'ustavno sodisce', 'zakon', 'novela', 'soocenje', 'anketa', 'javno mnenje',
        'upokojenc', 'pokojnin', 'zpis', 'socialni transferji', 'minimalna placa', 'sindikat', 'stavka', 'protest',
        
        'zdravstvo', 'zdravstveni dom', 'ukc', 'sb ', 'fides', 'cakalne dobe', 'koncesij', 
        'solstvo', 'ucitelji', 'matura', 'vpis v sole', 'vrtec',
        
        '/mnenja/', '/kolumne/', '/pisma-bralcev/', '/sobotna-priloga/', '/preverjamo/', '/stevilke/',
        'vreme', 'arso', 'napoved', 'sneg', 'dez', 'neurje', 'toca',
        'dobrodeln', 'zbiranje pomoci', 'pomoc', 'gasilska zveza',

        'prazniki', 'dela prosti', 'koledar', 'novo leto', 'prvi maj', 'bozicnica', 'regres', 'izplen',
        'okolje', 'odpadki', 'reciklaza', 'komunala', 
        'zeleznice', 'sz', 'potniski promet', 'vlak' 
    ]
  },
  {
    id: 'svet',
    label: 'Svet',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    keywords: [
        '/svet/', '/tujina/', '/evropa/', '/zda/', '/globalno/',
        'ukrajina', 'rusija', 'putin', 'zelenski', 'kijev', 'moskva',
        'gaza', 'izrael', 'palestina', 'hamas', 'netanjahu', 'bliznji vzhod', 'rdece morje', 'hutiji', 'jemen', 'libanon', 'hezbolah',
        'kitajska', 'tajvan', 'severna koreja', 'iran',
        'bela hisa', 'trump', 'biden', 'kamala', 'republikanci', 'demokrati', 'kongres',
        'eu', 'evropska komisija', 'evropski parlament', 'von der leyen', 'nato', 'zman', 
        'scholz', 'macron', 'orban', 'vucic', 'plenkovic',
        'potres', 'poplave v tujini', 'letalska nesreca', 'terorist', 'napad',
        'epstein', 'windsor', 'kralj', 'papez',
        'hrvaska', 'zagreb', 'beograd', 'balkan', 'kuna', 'valuta'
    ]
  },
  {
    id: 'kronika',
    label: 'Kronika',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    keywords: [
        '/kronika/', '/crna-kronika/', 
        'policija', 'policisti', 'pu ljubljana', 'pu maribor', 'pu koper', 'pu celje', 'pu novo mesto',
        'gasilci', 'pgd', 'pozar', 'intervencija', 'gorelo', 'eksplozij',
        'nesreca', 'trcenje', 'prometna nesreca', 'povozil', 'prevrnil', 'cesta zaprta',
        'kriminal', 'rop', 'vlom', 'drza', 'napad', 'pretep', 'umor', 'uboj', 'truplo', 'utonil',
        'sodisce', 'sojenje', 'zapor', 'pripor', 'obtoznica', 'obsodba',
        'pogresana', 'iskalna akcija', 'gorska resevalna', 'grs', 'resevalci', 'helikopter',
        'petarda', 'pirotehnik', 'poskodba', 'alkohol', 'vinjen'
    ]
  },
  {
    id: 'sport',
    label: 'Šport',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    keywords: [
        '/sport/', '/sportal/', '/sport-', 
        'nogomet', 'prva liga', 'maribor', 'olimpija', 'mura', 'celje', 'reprezentanca', 'kek', 'oblack', 'sesko',
        'liga prvakov', 'uefa', 'fifa', 'real madrid', 'barcelona', 'manchester', 'liverpool',
        'kosarka', 'nba', 'dallas', 'doncic', 'lukamagic', 'dragic', 'cedevita', 'olimpija', 'euroleague',
        'smucanje', 'skoki', 'planica', 'kranjska gora', 'shiffrin', 'odermatt', 'lanisek', 'prevc', 'zajc', 'kriznar', 'ljubno', 'skakalnic',
        'kolesarstvo', 'pogacar', 'roglic', 'tour de france', 'giro', 'vuelta',
        'odbojka', 'rokomet', 'atletika', 'tenis', 'djokovic', 'nadal', 'alkaraz',
        'plezanje', 'garnbret', 'motogp', 'formula 1', 'verstappen', 'hamilton'
    ]
  },
  {
    id: 'posel-tech',
    label: 'Posel & Tehnologija',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: [
        '/gospodarstvo/', '/posel/', '/finance/', '/borza/', '/podjetnistvo/',
        'delnice', 'kripto', 'bitcoin', 'ethereum', 'inflacija', 'obrestne mere', 'ecb', 'euribor',
        'banka', 'nlb', 'nkbm', 'poslovanje', 'dobicek', 'izguba', 'stecaj', 'prihodki',
        'davki', 'furs', 'dohodnina', 'bilanca', 'subvencije', 'razpis',
        'energetika', 'hse', 'gen-i', 'elektrika', 'plin', 'nafta', 'bencin', 'dizel', 'cene goriv',
        'nepremicnine', 'stanovanja', 'najemnine', 'gradbenistvo',
        'sindikat', 'zaposlitev', 'trg dela', 'brezposelnost', 'placa', 'zasluzek',
        'poklic', 'delovno mesto', 'kariera', 'siht',
        'evrov', 'evra', 'cena', 'stroski', 'draginja',
        
        '/znanost/', '/tehnologija/', '/tech/', '/it/', '/telekomunikacije/',
        'apple', 'iphone', 'samsung', 'galaxy', 'xiaomi', 'huawei', 'honor', 'sony',
        'google', 'microsoft', 'meta', 'facebook', 'instagram', 'tiktok', 'x', 'twitter',
        'umetna inteligenca', 'ai', 'chatgpt', 'openai', 'robotika', 'vesolje', 'nasa', 'spacex',
        'aplikacija', 'programiranje', 'kibernetska varnost', 'hekerji', 'prevara'
    ]
  },
  {
    id: 'moto',
    label: 'Mobilnost', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    keywords: [
        '/auto/', '/avto/', '/avtomobilizem/', '/mobilnost/', 
        'testi vozil', 'vozili smo', 'novi model', 'premiera',
        'elektricni avto', 'ev', 'tesla', 'byd', 'volkswagen', 'bmw', 'audi', 'mercedes', 'renault', 'toyota',
        'suv', 'limuzina', 'karavan', 'hibrid',
        'promet', 'dars', 'vinjeta', 'predor', 'karavanke', 'zastoj', 'radar', 'kazen',
        'voznja', 'voznik' 
    ]
  },
  {
    id: 'lifestyle',
    label: 'Življenjski slog',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    keywords: [
        '/zdravje/', '/dobro-pocutje/', '/duhovnost/', '/stil/', '/osebna-rast/', 
        'bolezen', 'simptomi', 'zdravnik', 'rak ', 'srce', 'diabetes', 'tlak', 'holesterol',
        'hujsanje', 'dieta', 'vadba', 'fitnes', 'joga', 'stres', 'izgorelost', 'spanje', 'nespecnost',
        'vitamin', 'mineral', 'prehransko dopolnilo', 'imunski sistem',
        'spanec', 'spanje', 'telesna aktivnost', 'studija', 'hoja', 'trening', 'hidracij', 'voda', 'pijaca',
        'utrujen', 'energij', 'pocutje', 'hiv', 'virus', 'okuzba',

        // ŽIVALI
        'zivali', 'ljubljenck', 'pes ', 'psi', 'macka', 'zavetisc', 'posvojit', 'cebela',

        // ODNOSI
        'odnosi', 'partnerstvo', 'samsk', 'zmenki', 'toksicn', 'custva', 'psihologija', 
        'locitev', 'razhod', 'sreca', 'zadovoljstvo', 'osamljenost',
        'dušni', 'dusa', 'rast', 'motivacij',
        
        '/kulinarika/', '/okusno/', '/recepti/', 
        'recept', 'kosilo', 'vecerja', 'sladica', 'pecivo', 'torta', 'kuhanje', 'pecenje',
        'sestavine', 'jedi', 'gastronomija', 'michelin',
        'shranjevanj', 'svezin', 'zivil', 'solata', 'vino', 'vinograd', 'trgatev', 'sampanjec',
        
        // KOMERCIALNI LIFESTYLE
        'lidl', 'hofer', 'spar', 'mercator', 'deluxe', 'gurman', 'akcija', 'ponudba',
        
        // DOM & VRT
        '/dom/', '/vrt/', '/bivanje/', 
        'hisa', 'stanovanje', 'interier', 'notranja oprema', 'prenova', 'dekoracija',
        'vrtnarjenje', 'rastline', 'cvetje', 'zelenjavni vrt', 'sadno drevje',
        'gradnja', 'montazna hisa', 'lumar', 'toplotna crpalka', 'ogrevanje', 'soncna elektrarna',
        'ciscenje', 'pospravljanje', 'nasveti', 'triki',
        'blagoslov', 'tradicij', 'navad', 'montazn', 'novogradnj', 'nepremicnin',
        'his ', 'hisah', 
        'nakit',
        
        '/potovanja/', '/izleti/', '/turizem/', 
        'dopust', 'počitnice', 'morje', 'hribi', 'izlet', 'hotel', 'kampiranje', 'grad ', 'razgled', 'potep',
        'jaslice'
    ]
  },
  {
    id: 'kultura',
    label: 'Kultura',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    keywords: [
        '/kultura/', '/umetnost/', '/knjige/', '/film/', '/glasba/', '/gledalisce/',
        'razstava', 'muzej', 'galerija', 'slikar', 'kip', 'umetnik',
        'koncert', 'opera', 'balet', 'filharmonija',
        'kino', 'premiera', 'oskarji', 'cannes', 'liffe', 'sarajevo film festival',
        'knjizni sejem', 'pisatelj', 'pesnik', 'roman', 'zbirka',
        'rtv', 'dokumentarec', 'oddaja', 'karikatura', 'strip',
        'umrl', 'pevec', 'skupina', 'bend', 'parni valjak'
    ]
  },
  {
    id: 'magazin',
    label: 'Magazin',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    keywords: [
        '/magazin/', '/scena/', '/zvezde/', '/zabava/', '/traci/', '/bulvar/', '/zabava-in-slog/', '/znani/',
        'kardashian', 'royal', 'kraljeva druzina', 'harry', 'meghan', 'william', 'kate',
        'jagger', 'madonna', 'shakira', 'taylor swift',
        'slovenski estradniki', 'znani slovenci', 'vplivnezi', 'influencer',
        'ločitev', 'poroka', 'nosečnost', 'afera', 'škandal', 'porocil', 'mladoporoc', 'zaroka', 'zaročil',
        'otrok', 'noseca', 
        
        // ZABAVNA TV & SERIJE
        'kmetija', 'sanjski moski', 'poroka na prvi pogled', 'slovenija ima talent', 'zvezde plesejo', 'masterchef',
        'evrovizija', 'ema',
        'lovci', 'kviz', 'joker', 'milijonar', 'kolo srece', 'tv oddaja', 'televizij', 'voditelj', 'voditeljica',
        'serija', 'serije', 'streaming', 'netflix', 'hbo', 'skyshowtime', 'voyo',
        
        'horoskop', 'astro', 'zodiak', 'napoved za',
        'retrogradn', 'merkur', 'venera',
        
        'viralno', 'smesno', 'video', 'foto', 'sokantno', 'ganljivo',
        'kviz', 'uganka', 'zanimivosti', 'krizanka', 'sudoku'
    ]
  }
]

// --- PRIORITETA PREVERJANJA ---
const PRIORITY_CHECK_ORDER: CategoryId[] = [
  'sport',        
  'moto',         
  'posel-tech',   
  'svet',         
  'kronika',      
  'kultura',      
  'slovenija',    
  'lifestyle',    
  'magazin'       
]

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// --- POSODOBLJENA FUNKCIJA Z NOVO LOGIKO ---
export function determineCategory(item: { 
  link: string; 
  title?: string; 
  contentSnippet?: string; 
  categories?: string[];
  keywords?: string[]; // <--- NOVO: Polje generiranih tagov
}): CategoryId {
  
  const url = item.link.toLowerCase()
  
  // 1. PREVERJANJE URL-JA (Najmočnejši indikator)
  for (const id of PRIORITY_CHECK_ORDER) {
    const cat = CATEGORIES.find(c => c.id === id)
    if (cat && cat.keywords.some(k => k.startsWith('/') && url.includes(k))) {
      return cat.id
    }
  }

  // 2. PREVERJANJE RSS KATEGORIJ
  if (item.categories && item.categories.length > 0) {
    const rssCats = item.categories.map(c => unaccent(c)).join(' ')
    for (const id of PRIORITY_CHECK_ORDER) {
      const cat = CATEGORIES.find(c => c.id === id)
      if (cat && cat.keywords.some(k => {
         const cleanK = unaccent(k.replace(/\//g, '')) 
         return cleanK.length > 2 && rssCats.includes(cleanK) 
      })) {
        return cat.id
      }
    }
  }

  // 3. (NOVO) PREVERJANJE GENERIRANIH KLJUČNIH BESED (Tagov)
  // To reši problem sklanjanja (npr. "dvojno" -> "dvojn", "zmago" -> "zmag")
  if (item.keywords && Array.isArray(item.keywords) && item.keywords.length > 0) {
    for (const id of PRIORITY_CHECK_ORDER) {
      const cat = CATEGORIES.find(c => c.id === id)
      if (!cat) continue;

      const hasMatch = cat.keywords.some(configKeyword => {
        // Ignoriramo URL vzorce
        if (configKeyword.startsWith('/')) return false;
        
        const cleanConfigKw = unaccent(configKeyword);
        if (cleanConfigKw.length <= 2) return false;

        // Preverimo ujemanje z BILO KATERIM tagom iz baze
        // Uporabimo includes v obe smeri za max zajem
        return item.keywords!.some(dbTag => {
           const cleanDbTag = unaccent(dbTag);
           return cleanConfigKw.includes(cleanDbTag) || cleanDbTag.includes(cleanConfigKw);
        });
      });

      if (hasMatch) {
        return cat.id;
      }
    }
  }

  // 4. PREVERJANJE NASLOVA IN KRATKE VSEBINE (Fallback)
  const combinedText = unaccent((item.title || '') + ' ' + (item.contentSnippet || ''))
  for (const id of PRIORITY_CHECK_ORDER) {
    const cat = CATEGORIES.find(c => c.id === id)
    if (cat && cat.keywords.some(k => !k.startsWith('/') && k.length > 2 && combinedText.includes(unaccent(k)))) {
      return cat.id
    }
  }

  return 'ostalo'
}

export function getKeywordsForCategory(catId: string): string[] {
  const cat = CATEGORIES.find(c => c.id === catId)
  return cat ? cat.keywords : []
}
