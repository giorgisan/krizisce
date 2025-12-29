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
    id: 'magazin', // NAJVIŠJA PRIORITETA: Da "Severina" ne gre v "Posel" zaradi "milijonov"
    label: 'Magazin',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    keywords: [
        '/magazin/', '/scena/', '/zvezde/', '/zabava/', '/traci/', '/bulvar/', '/ljudje/',
        // ZVEZDNIKI (Dodajaj po potrebi, uporabi korene)
        'kardashian', 'jenner', 'royal', 'kraljev', 'harry', 'meghan', 'william', 'kate',
        'jagger', 'madonna', 'shakira', 'swift', 'beyonc', 'severin', 'prijovic', 'lepa bren', 'ceca',
        'chal', 'sale', 'bas', // Challe Salle itd.
        'znani', 'vplivnez', 'influencer', 'estradnik', 'zvezdnic', 'zvezdnik', 'ikon',
        
        // DOGODKI
        'locitev', 'poroka', 'nosecnost', 'afera', 'skandal', 'mladoporoc', 'zaroka', 'nosec', 'baby',
        
        // TV & SHOWBIZ
        'kmetija', 'sanjski', 'talent', 'zvezde plesejo', 'masterchef', 'evrovizij', 'ema',
        'kviz', 'joker', 'milijonar', 'kolo srece', 'voditelj', 'resnicnostn', 'serij', 'film', 'netflix',
        
        // ASTRO & VIRALNO
        'horoskop', 'astro', 'zodiak', 'retrogradn', 'merkur', 'luna', 'scip',
        'prerok', 'nostradamus', 'vanga', 'napoved', 'srhljiv', 'katastrof', // Nostradamus
        'viral', 'smesn', 'video', 'sokantn', 'ganljiv', 'tiktok'
    ]
  },
  {
    id: 'lifestyle', // VISOKA PRIORITETA: Da "Lučke" ne gredo v "Posel"
    label: 'Življenjski slog',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    keywords: [
        '/zdravje/', '/dobro-pocutje/', '/duhovnost/', '/stil/', '/osebna-rast/', '/bivanje/',
        // ZDRAVJE
        'bolezen', 'simptom', 'zdravnik', 'rak', 'srce', 'diabetes', 'tlak', 'holesterol',
        'hujsanj', 'diet', 'vadba', 'fitnes', 'joga', 'stres', 'izgorel', 'spanj', 'nespecnost',
        'vitamin', 'mineral', 'imunsk', 'prehlad', 'grip', 'covid', 'virus', 'okuzb', 'demenc', 'mozgan',
        
        // HRANA
        '/kulinarika/', '/okusno/', '/recepti/', 
        'recept', 'kosilo', 'vecerja', 'sladica', 'pecivo', 'tort', 'kuhanj', 'pecenj',
        'sestavin', 'jed', 'gastronom', 'michelin', 'juh', 'solat', 'kis', 'zelj', 'sarm', 'potic',
        
        // DOM, VRT & PRAZNIKI
        '/dom/', '/vrt/', 
        'hisa', 'stanovan', 'interier', 'oprema', 'prenova', 'dekoracij',
        'vrtnar', 'rastlin', 'cvet', 'zelenjav', 'sadn',
        'ciscenj', 'pospravljanj', 'triki', 'nasvet',
        'luck', 'okrask', 'smrecic', 'jelk', 'praznicn', 'bozic', 'daril', 'obdarovan', 'dedek mraz',
        'poraba', 'varcevanj', // Varčevanje v gospodinjstvu
        
        // ODNOSI & PSIHOLOGIJA
        'odnos', 'partner', 'samsk', 'zmenk', 'toksic', 'custv', 'psiholog', 
        'locitev', 'razhod', 'sreca', 'zadovoljstv', 'osamljen', 'dusn', 'dusa', 'motivacij', 'intuicij',
        
        // ŽIVALI
        'zival', 'ljubljenck', 'pes', 'psi', 'mack', 'zavetisc', 'posvojit', 'cebel', 'medved',
        
        // POTOVANJA
        '/potovanja/', '/izleti/', '/turizem/', 
        'dopust', 'pocitnic', 'morje', 'hrib', 'izlet', 'hotel', 'kamp', 'razgled', 'potep'
    ]
  },
  {
    id: 'sport',
    label: 'Šport',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    keywords: [
        '/sport/', '/sportal/', 
        // ZIMSKI
        'smuc', 'skoki', 'skakal', 'planica', 'kranjska gora', 'shiffrin', 'odermatt', 'lanisek', 'prevc', 'zajc', 'kriznar', 'ljubno',
        'turnej', 'oberstdorf', 'bischofshofen', 'garmisch', 'innsbruck', 'biatlon', 'slalom', 'veleslalom',
        
        // EKIPNI
        'nogomet', 'liga', 'maribor', 'olimpija', 'celje', 'mura', 'reprezentanc', 'kek', 'oblak', 'sesko', 'uefa', 'fifa',
        'kosarka', 'nba', 'dallas', 'doncic', 'dragic', 'lakovic', 'euroleague', 'cedevita',
        'odbojka', 'rokomet',
        
        // OSTALO
        'kolesar', 'pogacar', 'roglic', 'tour', 'giro', 'vuelta',
        'tenis', 'djokovic', 'nadal', 'alkaraz',
        'plezanje', 'garnbret', 'motogp', 'formula 1', 'verstappen', 'hamilton',
        'boks', 'joshua', 'tyson', 'fury',
        'tekma', 'rezultat', 'lestvica', 'pokal', 'kolajn', 'medalj', 'olimpijsk'
    ]
  },
  {
    id: 'moto',
    label: 'Mobilnost', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    keywords: [
        '/auto/', '/avto/', '/avtomobilizem/', '/mobilnost/', 
        'test', 'vozil', 'model', 'premier',
        'elektricn avto', 'tesla', 'byd', 'volkswagen', 'bmw', 'audi', 'mercedes', 'renault', 'toyota',
        'suv', 'limuzin', 'karavan', 'hibrid',
        'promet', 'dars', 'vinjet', 'predor', 'karavank', 'zastoj', 'radar', 'kazen',
        'voznja', 'voznik', 'tovornjak', 'avtocest'
    ]
  },
  {
    id: 'kronika',
    label: 'Kronika',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    keywords: [
        '/kronika/', '/crna-kronika/', 
        'policij', 'policist', 'pu ', 'kriminal', 
        'gasilc', 'pozar', 'intervencij', 'gorel', 'eksplozij',
        'nesrec', 'trcenj', 'prometn', 'povozil', 'prevrnil', 'cesta zaprta',
        'rop', 'vlom', 'drza', 'napad', 'pretep', 'umor', 'uboj', 'truplo', 'utonil', 'mrtv', 'smrt',
        'sodisc', 'sojenj', 'zapor', 'pripor', 'obtoznic', 'obsodb',
        'pogresan', 'iskaln', 'resevalc', 'helikopter',
        'petard', 'pirotehnik', 'poskodb', 'alkohol', 'vinjen', 'vandal', 'oskrunjen', 'tragedij'
    ]
  },
  {
    id: 'kultura',
    label: 'Kultura',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    keywords: [
        '/kultura/', '/umetnost/', '/knjige/', '/film/', '/glasba/', '/gledalisce/',
        'razstav', 'muzej', 'galerij', 'slikar', 'kip', 'umetnik',
        'koncert', 'opera', 'balet', 'filharmonij', 'zbor',
        'kino', 'premier', 'oskar', 'cannes', 'liffe', 'sarajevo film',
        'knjizn', 'pisatelj', 'pesnik', 'roman', 'zbirk',
        'dokumentarec', 'karikatur', 'strip',
        'umrl', 'pevec', 'skupin', 'bend', 'parni valjak', 'glasben' // "Umrl" je tu tvegan, a za umetnike ok
    ]
  },
  {
    id: 'posel-tech', // NIŽJA PRIORITETA: Da "ujame" samo tisto, kar ostali niso
    label: 'Posel & Tehnologija',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: [
        '/gospodarstvo/', '/posel/', '/finance/', '/borza/', '/podjetnistvo/', '/tech/', '/znanost/',
        // FINANCE
        'delnic', 'kripto', 'bitcoin', 'ethereum', 'inflacij', 'obrest', 'ecb', 'euribor',
        'banka', 'nlb', 'nkbm', 'poslovanj', 'dobicek', 'izgub', 'stecaj', 'prihodk',
        'davk', 'furs', 'dohodnin', 'bilanc', 'subvencij', 'razpis', 'proracun',
        'bdp', 'recesij', 'investicij', 'vlagatelj',
        
        // PODJETJA
        'energetik', 'hse', 'gen-i', 'lek', 'krka', 'petrol', 'mercator',
        
        // DELO
        'sindikat', 'zaposlitev', 'trg del', 'brezposelnost', 'plac', 'zasluzek', 'stavk',
        'poklic', 'karier', 'siht', 'izvoz', 'panog',
        
        // NEPREMIČNINE (Samo poslovni vidik)
        'nepremicninski trg', 'stanovanjsk sklad', 'gradbenistv', 'novogradnj',
        
        // ENERGIJA (Poslovni vidik)
        'naft', 'bencin', 'dizel', 'cen goriv', 'elektricn energij',
        
        // TECH
        'apple', 'iphone', 'samsung', 'xiaomi', 'huawei', 'sony', 'microsoft', 'google', 'meta', 'twitter',
        'umetn inteligenc', 'chatgpt', 'openai', 'robotik', 'vesolj', 'nasa', 'spacex',
        'aplikacij', 'programiranj', 'kibernetsk', 'heker', 'prevar', 'znanstven'
    ]
  },
  {
    id: 'svet',
    label: 'Svet',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    keywords: [
        '/svet/', '/tujina/', '/evropa/', '/globalno/',
        'ukrajin', 'rusij', 'putin', 'zelensk', 'kijev', 'moskv',
        'gaza', 'izrael', 'palestin', 'hamas', 'netanjahu', 'bliznj vzhod', 'hutij', 'libanon', 'hezbolah',
        'kitajsk', 'tajvan', 'korej', 'iran',
        'zda', 'bela hisa', 'trump', 'biden', 'harris', 'republikanc', 'demokrat', 'kongres',
        'eu', 'evropsk komisij', 'parlament', 'von der leyen', 'nato',
        'scholz', 'macron', 'orban', 'vucic', 'plenkovic',
        'potres', 'poplav', 'terorist', 'napad', // Lahko se prekriva s kroniko, a če je tujina je Svet
        'hrvask', 'zagreb', 'beograd', 'balkan', 'kun', 'valut'
    ]
  },
  {
    id: 'slovenija',
    label: 'Slovenija',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    keywords: [
        '/slovenija/', '/lokalno/', '/obcine/', '/regije/',
        'ljubljan', 'maribor', 'celj', 'koper', 'kranj', 'nov mest', 'velenj', 'mursk sobot',
        'obcin', 'zupan', 'svetnik', 'komunal', 'vodovod', 'kanalizacij', 'cest',
        
        // POLITIKA
        'vlada', 'parlament', 'drzavni zbor', 'poslanc', 'ministr', 'premier', 'predsednik',
        'pirc musar', 'golob', 'jansa', 'tonin', 'mesec', 'fajon', 'logar', 
        'svoboda', 'sds', 'nsi', 'levica', 'sd',
        'referendum', 'ustavn sodisc', 'zakon', 'novel', 'soocenj', 'anket',
        'upokojenc', 'pokojnin', 'zpis', 'socialn transfer', 'minimaln plac',
        
        // DRUŽBA
        'zdravstv', 'zdravstven dom', 'ukc', 'fides', 'cakaln dob', 'koncesij', 
        'solstv', 'ucitelj', 'matur', 'vpis', 'vrtec',
        
        // RAZNO
        '/mnenja/', '/kolumne/', 'vreme', 'arso', 'napoved', 'sneg', 'dez', 'neurj', 'toc',
        'dobrodeln', 'gasilsk zvez'
    ]
  }
]

// --- POMEMBNO: VRSTNI RED PREVERJANJA ---
const PRIORITY_CHECK_ORDER: CategoryId[] = [
  'magazin',      // 1. Specifične osebnosti in trači
  'lifestyle',    // 2. Specifične teme (hrana, zdravje)
  'sport',        // 3. Jasni športni pojmi
  'moto',         // 4. Jasni avto pojmi
  'kronika',      // 5. Jasni kriminal/nesreče
  'kultura',      // 6. Kultura
  'posel-tech',   // 7. Posel (pazi, da ne požre "cene" v trgovini)
  'svet',         // 8. Tujina
  'slovenija',    // 9. Vse ostalo domače
]

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function determineCategory(item: { 
  link: string; 
  title?: string; 
  contentSnippet?: string; 
  categories?: string[];
  keywords?: string[]; 
}): CategoryId {
  
  const url = item.link.toLowerCase()
  
  // 1. PREVERJANJE URL-JA
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

  // 3. PREVERJANJE KEYWORDOV (Tagov)
  if (item.keywords && Array.isArray(item.keywords) && item.keywords.length > 0) {
    for (const id of PRIORITY_CHECK_ORDER) {
      const cat = CATEGORIES.find(c => c.id === id)
      if (!cat) continue;

      const hasMatch = cat.keywords.some(configKeyword => {
        if (configKeyword.startsWith('/')) return false;
        
        const cleanConfigKw = unaccent(configKeyword);
        if (cleanConfigKw.length <= 2) return false;

        return item.keywords!.some(dbTag => {
           const cleanDbTag = unaccent(dbTag);
           
           // Strogo ujemanje: Tag mora biti enak ali vsebovati keyword
           // NE dovolimo, da kratek tag ("nad") ujame dolg keyword ("napad")
           
           if (cleanDbTag === cleanConfigKw) return true;
           if (cleanDbTag.includes(cleanConfigKw)) return true;
           
           // Izjema: Če je tag dolg (npr. "nogometas"), lahko ujame krajši keyword ("nogomet")
           if (cleanDbTag.length > 3 && cleanDbTag.startsWith(cleanConfigKw)) return true;

           return false;
        });
      });

      if (hasMatch) {
        return cat.id;
      }
    }
  }

  // 4. PREVERJANJE NASLOVA (Fallback)
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
