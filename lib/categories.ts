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

// 1. VRSTNI RED ZA PRIKAZ V MENIJU
export const CATEGORIES: CategoryDef[] = [
  {
    id: 'slovenija',
    label: 'Slovenija',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    keywords: [
        '/slovenija/', '/lokalno/', '/obcine/', '/regije/',
        'ljubljan', 'maribor', 'celj', 'koper', 'kranj', 'nov mest', 'velenj', 'mursk sobot',
        'obcin', 'zupan', 'svetnik', 'komunal', 'vodovod', 'kanalizacij', 'cest',
        'vlada', 'parlament', 'drzavni zbor', 'poslanc', 'ministr', 'premier', 'predsednik',
        'pirc musar', 'golob', 'jansa', 'tonin', 'mesec', 'fajon', 'logar', 
        'svoboda', 'sds', 'nsi', 'levica', 'sd',
        'referendum', 'ustavn sodisc', 'zakon', 'novel', 'soocenj', 'anket',
        'upokojenc', 'pokojnin', 'zpis', 'socialn transfer', 'minimaln plac',
        'zdravstv', 'zdravstven dom', 'ukc', 'fides', 'cakaln dob', 'koncesij', 
        'solstv', 'ucitelj', 'matur', 'vpis', 'vrtec',
        '/mnenja/', '/kolumne/', 'vreme', 'arso', 'napoved', 'sneg', 'dez', 'neurj', 'toc',
        'dobrodeln', 'gasilsk zvez'
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
        'potres', 'poplav', 'terorist', 'napad', 
        'hrvask', 'zagreb', 'beograd', 'balkan', 'kun', 'valut'
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
        'trcenj', 'prometn nesrec', 'povozil', 'prevrnil', 'cesta zaprta',
        'rop', 'vlom', 'drza', 'pretep', 'umor', 'uboj', 'truplo', 'utonil', 'mrtv', 'smrt',
        'sodisc', 'sojenj', 'zapor', 'pripor', 'obtoznic', 'obsodb',
        'pogresan', 'iskaln', 'resevalc', 'helikopter',
        'petard', 'pirotehnik', 'poskodb', 'alkohol', 'vinjen', 'vandal', 'oskrunjen', 'tragedij'
    ]
  },
  {
    id: 'sport',
    label: 'Šport',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    keywords: [
        '/sport/', '/sportal/', 
        'smuc', 'skoki', 'skakal', 'planica', 'kranjska gora', 'shiffrin', 'odermatt', 'lanisek', 'prevc', 'zajc', 'kriznar', 'ljubno',
        'turnej', 'oberstdorf', 'bischofshofen', 'garmisch', 'innsbruck', 'biatlon', 'slalom', 'veleslalom',
        'nogomet', 'liga', 'maribor', 'olimpija', 'celje', 'mura', 'reprezentanc', 'kek', 'oblak', 'sesko', 'uefa', 'fifa',
        'kosarka', 'nba', 'dallas', 'doncic', 'dragic', 'lakovic', 'euroleague', 'cedevita',
        'odbojka', 'rokomet',
        'kolesar', 'pogacar', 'roglic', 'tour', 'giro', 'vuelta',
        'tenis', 'djokovic', 'nadal', 'alkaraz', 'sabalenk', 'kyrgios',
        'plezanje', 'garnbret', 'motogp', 'formula 1', 'verstappen', 'hamilton',
        'boks', 'joshua', 'tyson', 'fury',
        'tekma', 'rezultat', 'lestvica', 'pokal', 'kolajn', 'medalj', 'olimpijsk'
    ]
  },
  {
    id: 'posel-tech',
    label: 'Posel & Tech',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: [
        '/gospodarstvo/', '/posel/', '/finance/', '/borza/', '/podjetnistvo/', '/tech/', '/znanost/',
        'delnic', 'kripto', 'bitcoin', 'ethereum', 'inflacij', 'obrest', 'ecb', 'euribor',
        'banka', 'nlb', 'nkbm', 'poslovanj', 'dobicek', 'izgub', 'stecaj', 'prihodk',
        'davk', 'furs', 'dohodnin', 'bilanc', 'subvencij', 'razpis', 'proracun',
        'bdp', 'recesij', 'investicij', 'vlagatelj',
        'energetik', 'hse', 'gen-i', 'lek', 'krka', 'petrol', 'mercator',
        'sindikat', 'zaposlitev', 'trg del', 'brezposelnost', 'plac', 'zasluzek', 'stavk',
        'poklic', 'karier', 'siht', 'izvoz', 'panog',
        'nepremicninski trg', 'stanovanjsk sklad', 'gradbenistv', 'novogradnj',
        'naft', 'bencin', 'dizel', 'cen goriv', 'elektricn energij',
        'apple', 'iphone', 'samsung', 'xiaomi', 'huawei', 'sony', 'microsoft', 'google', 'meta', 'twitter',
        'umetn inteligenc', 'chatgpt', 'openai', 'robotik', 'vesolj', 'nasa', 'spacex',
        'aplikacij', 'programiranj', 'kibernetsk', 'heker', 'prevar', 'znanstven'
    ]
  },
  {
    id: 'moto',
    label: 'Mobilnost', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    keywords: [
        '/auto/', '/avto/', '/avtomobilizem/', '/mobilnost/', 
        'test', 'vozil', 'model', 'premier',
        'elektricn avto', 'tesla', 'byd', 'volkswagen', 'bmw', 'audi', 'mercedes', 'renault', 'toyota', 'dacia',
        'suv', 'limuzin', 'karavan', 'hibrid',
        'promet', 'dars', 'vinjet', 'predor', 'karavank', 'zastoj', 'radar', 'kazen',
        'voznja', 'voznik', 'tovornjak', 'avtocest'
    ]
  },
  {
    id: 'magazin',
    label: 'Magazin',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    keywords: [
        '/magazin/', '/scena/', '/zvezde/', '/zabava/', '/traci/', '/bulvar/', '/ljudje/',
        'kardashian', 'jenner', 'royal', 'kraljev', 'harry', 'meghan', 'william', 'kate',
        'jagger', 'madonna', 'shakira', 'swift', 'beyonc', 'severin', 'prijovic', 'lepa bren', 'ceca',
        'chal', 'sale', 'bas', 
        'znani', 'vplivnez', 'influencer', 'estradnik', 'zvezdnic', 'zvezdnik', 'ikon', 'bardot', 'klum',
        'locitev', 'poroka', 'nosecnost', 'afera', 'skandal', 'mladoporoc', 'zaroka', 'nosec', 'baby',
        'kmetija', 'sanjski', 'talent', 'zvezde plesejo', 'masterchef', 'evrovizij', 'ema',
        'kviz', 'joker', 'milijonar', 'kolo srece', 'voditelj', 'resnicnostn', 'serij', 'film', 'netflix',
        'horoskop', 'astro', 'zodiak', 'retrogradn', 'merkur', 'luna', 'scip',
        'prerok', 'nostradamus', 'vanga', 'napoved', 'srhljiv', 'katastrof', 
        'viral', 'smesn', 'video', 'sokantn', 'ganljiv', 'tiktok'
    ]
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    keywords: [
        '/zdravje/', '/dobro-pocutje/', '/duhovnost/', '/stil/', '/osebna-rast/', '/bivanje/',
        'bolezen', 'simptom', 'zdravnik', 'rak', 'srce', 'diabetes', 'tlak', 'holesterol',
        'hujsanj', 'diet', 'vadba', 'fitnes', 'joga', 'stres', 'izgorel', 'spanj', 'nespecnost',
        'vitamin', 'mineral', 'imunsk', 'prehlad', 'grip', 'covid', 'virus', 'okuzb', 'demenc', 'mozgan', 'savn',
        'recept', 'kosilo', 'vecerja', 'sladica', 'pecivo', 'tort', 'kuhanj', 'pecenj',
        'sestavin', 'jed', 'gastronom', 'michelin', 'juh', 'solat', 'kis', 'zelj', 'sarm', 'potic',
        'hisa', 'stanovan', 'interier', 'oprema', 'prenova', 'dekoracij',
        'vrtnar', 'rastlin', 'cvet', 'zelenjav', 'sadn',
        'ciscenj', 'pospravljanj', 'triki', 'nasvet',
        'luck', 'okrask', 'smrecic', 'jelk', 'praznicn', 'bozic', 'daril', 'obdarovan', 'dedek mraz',
        'poraba', 'varcevanj',
        'odnos', 'partner', 'samsk', 'zmenk', 'toksic', 'custv', 'psiholog', 
        'locitev', 'razhod', 'sreca', 'zadovoljstv', 'osamljen', 'dusn', 'dusa', 'motivacij', 'intuicij',
        'zival', 'ljubljenck', 'pes', 'psi', 'mack', 'zavetisc', 'posvojit', 'cebel', 'medved',
        '/potovanja/', '/izleti/', '/turizem/', 
        'dopust', 'pocitnic', 'morje', 'hrib', 'izlet', 'hotel', 'kamp', 'razgled', 'potep'
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
        'umrl', 'pevec', 'skupin', 'bend', 'parni valjak', 'glasben'
    ]
  }
]

// --- 2. VRSTNI RED ZA TIE-BREAKER (PRI IZENAČENIH TOČKAH) ---
// Če ima članek enako točk za Šport in Slovenijo, zmaga Šport.
const PRIORITY_CHECK_ORDER: CategoryId[] = [
  'magazin',
  'sport',
  'moto',
  'lifestyle',
  'kronika',
  'kultura',
  'posel-tech',
  'svet',
  'slovenija',
]

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// --- 3. NOVA LOGIKA S TOČKOVANJEM ---
export function determineCategory(item: { 
  link: string; 
  title?: string; 
  contentSnippet?: string; 
  categories?: string[];
  keywords?: string[]; 
}): CategoryId {
  
  const url = item.link.toLowerCase()
  
  // A) URL VETO (Najmočnejši indikator - takojšnja zmaga)
  // Če je URL eksplicitno /sport/, ne rabimo šteti točk.
  for (const id of PRIORITY_CHECK_ORDER) {
    const cat = CATEGORIES.find(c => c.id === id)
    if (cat && cat.keywords.some(k => k.startsWith('/') && url.includes(k))) {
      return cat.id
    }
  }

  // Pripravimo objekt za točkovanje
  const scores: Record<CategoryId, number> = {
    slovenija: 0, svet: 0, kronika: 0, sport: 0, magazin: 0,
    lifestyle: 0, 'posel-tech': 0, moto: 0, kultura: 0, oglas: 0, ostalo: 0
  };

  // Zbirka vseh besed za analizo (Tagi + RSS kategorije)
  const tokensToAnalyze: string[] = [];

  // Dodamo generirane keyworde
  if (item.keywords && Array.isArray(item.keywords)) {
    tokensToAnalyze.push(...item.keywords.map(k => unaccent(k)));
  }

  // Dodamo RSS kategorije (očiščene)
  if (item.categories && Array.isArray(item.categories)) {
     tokensToAnalyze.push(...item.categories.map(c => unaccent(c)));
  }

  // Če nimamo ničesar, poskusimo naslov (kot fallback)
  if (tokensToAnalyze.length === 0) {
      const combined = unaccent((item.title || '') + ' ' + (item.contentSnippet || ''));
      tokensToAnalyze.push(...combined.split(/\s+/).filter(w => w.length > 3));
  }

  // B) GLAVNA ZANKA TOČKOVANJA
  // Gremo čez vsako besedo v članku (token) in preverimo, komu pripada
  for (const token of tokensToAnalyze) {
      for (const cat of CATEGORIES) {
          // Preverimo, ali se token ujema s katero od ključnih besed kategorije
          const match = cat.keywords.some(configKw => {
              if (configKw.startsWith('/')) return false; // Ignoriramo URL vzorce tukaj
              const cleanConfig = unaccent(configKw);
              
              // 1. Točno ujemanje (najboljše)
              if (token === cleanConfig) return true;
              // 2. Vsebovanje (npr. 'nogometas' vsebuje 'nogomet')
              if (token.includes(cleanConfig)) return true;
              // 3. Obratno (samo če je config dolg, npr. 'koroska' in token 'koros')
              if (cleanConfig.length > 4 && cleanConfig.includes(token)) return true;

              return false;
          });

          if (match) {
              scores[cat.id]++;
          }
      }
  }

  // C) ISKANJE ZMAGOVALCA
  let maxScore = 0;
  let bestCategory: CategoryId = 'ostalo';

  // Gremo po prioritetnem vrstnem redu. Če sta rezultata enaka, zmaga tisti, ki je višje na listi.
  for (const id of PRIORITY_CHECK_ORDER) {
      if (scores[id] > maxScore) {
          maxScore = scores[id];
          bestCategory = id;
      }
  }

  // D) PRAG (THRESHOLD)
  // Če je maxScore 0 (nobena beseda se ne ujema), ostane 'ostalo'.
  // Lahko bi rekli, da rabi vsaj 2 točki, a za kratke novice je 1 dovolj, 
  // ker imamo prioriteto za razreševanje konfliktov.
  
  return bestCategory;
}

export function getKeywordsForCategory(catId: string): string[] {
  const cat = CATEGORIES.find(c => c.id === catId)
  return cat ? cat.keywords : []
}
