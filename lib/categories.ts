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

// ============================================================================
// 1. DEFINICIJE KATEGORIJ IN KLJUČNIH BESED (OPTIMIZIRANO)
// ============================================================================
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
        'ukrajin', 'rusij', 'putin', 'zelensk', 'kijev', 'moskv', 'vojn', 'obroz',
        'gaza', 'izrael', 'palestin', 'hamas', 'netanjahu', 'bliznj vzhod', 'hutij', 'libanon', 'hezbolah',
        'kitajsk', 'tajvan', 'korej', 'iran',
        'zda', 'bela hisa', 'trump', 'biden', 'harris', 'republikanc', 'demokrat', 'kongres',
        'eu', 'evropsk komisij', 'parlament', 'von der leyen', 'nato',
        'scholz', 'macron', 'orban', 'vucic', 'plenkovic',
        'potres', 'poplav', 'terorist', 'napad', 'protest',
        'hrvask', 'zagreb', 'beograd', 'balkan', 'kun', 'valut'
    ]
  },
  {
    id: 'kronika',
    label: 'Kronika',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    keywords: [
        '/kronika/', '/crna-kronika/', 
        'policij', 'policist', 'pu ', 'kriminal', 'gasil', 'reseval',
        'pozar', 'intervencij', 'gorel', 'eksplozij',
        'trcenj', 'prometn', 'nesrec', 'povozil', 'prevrnil', 'cesta zaprta',
        'rop', 'vlom', 'drza', 'pretep', 'umor', 'uboj', 'truplo', 'utonil', 'mrtv', 'smrt',
        'sodisc', 'sojenj', 'zapor', 'pripor', 'obtoznic', 'obsodb',
        'pogresan', 'iskaln', 'helikopter', 'obmocj', 'voznik', 'alkohol',
        'petard', 'pirotehnik', 'poskodb', 'vinjen', 'vandal', 'oskrunjen', 'tragedij', 'groz'
    ]
  },
  {
    id: 'sport',
    label: 'Šport',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    keywords: [
        '/sport/', '/sportal/', 
        'zmag', 'poraz', 'tekm', 'lig', 'pokal', 'prvenstv', 'sezon', 'ekip', 'turnej', 'rezultat', 'trener',
        'smuc', 'skoki', 'skakal', 'planica', 'kranjska gora', 'shiffrin', 'odermatt', 'lanisek', 'prevc', 'zajc', 'kriznar', 'ljubno',
        'oberstdorf', 'bischofshofen', 'garmisch', 'innsbruck', 'biatlon', 'slalom', 'veleslalom',
        'nogomet', 'maribor', 'olimpija', 'celje', 'mura', 'reprezentanc', 'kek', 'oblak', 'sesko', 'uefa', 'fifa',
        'kosarka', 'nba', 'dallas', 'doncic', 'dragic', 'lakovic', 'euroleague', 'cedevita',
        'odbojka', 'rokomet',
        'kolesar', 'pogacar', 'roglic', 'tour', 'giro', 'vuelta',
        'tenis', 'djokovic', 'nadal', 'alkaraz', 'sabalenk', 'kyrgios',
        'plezanje', 'garnbret', 'motogp', 'formula 1', 'verstappen', 'hamilton',
        'boks', 'joshua', 'tyson', 'fury', 'olimpijsk'
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
        'bdp', 'recesij', 'investicij', 'vlagatelj', 'podjet', 'trg', 'nalozb',
        'energetik', 'hse', 'gen-i', 'lek', 'krka', 'petrol', 'mercator',
        'sindikat', 'zaposlitev', 'trg del', 'brezposelnost', 'plac', 'zasluzek', 'stavk',
        'poklic', 'karier', 'siht', 'izvoz', 'panog',
        'nepremicninski trg', 'stanovanjsk sklad', 'gradbenistv', 'novogradnj',
        'naft', 'bencin', 'dizel', 'cen goriv', 'elektricn energij',
        'apple', 'iphone', 'samsung', 'xiaomi', 'huawei', 'sony', 'microsoft', 'google', 'meta', 'twitter',
        'umetn inteligenc', 'chatgpt', 'openai', 'robotik', 'vesolj', 'nasa', 'spacex',
        'aplikacij', 'programiranj', 'kibernetsk', 'heker', 'prevar', 'znanstven', 'splet'
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
        'voznja', 'voznik', 'tovornjak', 'avtocest', 'hrosc',
        'elektricn'
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
        'kviz', 'joker', 'milijonar', 'kolo srece', 'voditelj', 'resnicnostn', 'serij', 'film', 'netflix', 'suzy',
        'horoskop', 'astro', 'zodiak', 'retrogradn', 'merkur', 'luna', 'scip', 'znamenj',
        'prerok', 'nostradamus', 'vanga', 'napoved', 'srhljiv', 'katastrof', 
        'viral', 'smesn', 'video', 'sokantn', 'ganljiv', 'tiktok', 'par', 'razhod',
        'pev', 'igral', 'resnicnost'
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
        'recept', 'kosilo', 'vecerja', 'sladica', 'pecivo', 'tort', 'kuhanj', 'pecenj', 'hran', 'okus',
        'sestavin', 'jed', 'gastronom', 'michelin', 'juh', 'solat', 'kis', 'zelj', 'sarm', 'potic',
        'hisa', 'stanovan', 'interier', 'oprema', 'prenova', 'dekoracij', 'dom', 'vrt',
        'vrtnar', 'rastlin', 'cvet', 'zelenjav', 'sadn',
        'ciscenj', 'pospravljanj', 'triki', 'nasvet',
        'luck', 'okrask', 'smrecic', 'jelk', 'praznicn', 'bozic', 'daril', 'obdarovan', 'dedek mraz', 'prazni',
        'poraba', 'varcevanj',
        'odnos', 'partner', 'samsk', 'zmenk', 'toksic', 'custv', 'psiholog', 
        'locitev', 'razhod', 'sreca', 'zadovoljstv', 'osamljen', 'dusn', 'dusa', 'motivacij', 'intuicij',
        'zival', 'ljubljenck', 'pes', 'psi', 'mack', 'zavetisc', 'posvojit', 'cebel', 'medved',
        '/potovanja/', '/izleti/', '/turizem/', 
        'dopust', 'pocitnic', 'morje', 'hrib', 'izlet', 'hotel', 'kamp', 'razgled', 'potep',
        'huj'
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

// ============================================================================
// 2. VRSTNI RED ZA TIE-BREAKER (PRI IZENAČENIH TOČKAH)
// ============================================================================
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

// ============================================================================
// 3. NAPREDNA LOGIKA ZA DOLOČANJE KATEGORIJE
// ============================================================================
// --- HIBRIDNA LOGIKA (URL + VSEBINA ZA SPLOŠNE RUBRIKE) ---
export function determineCategory(item: { 
  link: string; 
  title?: string; 
  contentSnippet?: string; 
  categories?: string[];
  keywords?: string[]; 
}): CategoryId {
  
  const url = item.link.toLowerCase();
  
  // A1) MOČNI URL SIGNALI (Ti so specifični in skoraj vedno točni)
  if (url.includes('/kronika/') || url.includes('/crna-kronika/') || url.includes('/crna/')) return 'kronika';
  if (url.includes('/sport/') || url.includes('/sportal/') || url.includes('/nogomet/') || url.includes('/kosarka/') || url.includes('/zimski-sporti/')) return 'sport';
  if (url.includes('/avto/') || url.includes('/avtomoto/') || url.includes('/mobilnost/')) return 'moto';
  if (url.includes('/magazin/') || url.includes('/bulvar/') || url.includes('/scena/') || url.includes('/zvezde/') || url.includes('/popin/')) return 'magazin';
  if (url.includes('/lifestyle/') || url.includes('/zdravje/') || url.includes('/okusno/') || url.includes('/kulinarika/') || url.includes('/dom/')) return 'lifestyle';
  if (url.includes('/gospodarstvo/') || url.includes('/posel/') || url.includes('/finance/') || url.includes('/digisvet/') || url.includes('/tech/')) return 'posel-tech';
  if (url.includes('/kultura/')) return 'kultura';

  // A2) ŠIBKI URL SIGNALI (Slovenija in Svet sta preveč splošna)
  // Če URL pravi "Slovenija", je to lahko politika, lahko pa skrita kronika (kot 24ur primer).
  // Zato si to zapomnimo kot "začasno izbiro", a vseeno preverimo vsebino.
  let urlHint: CategoryId | null = null;
  if (url.includes('/svet/') || url.includes('/tujina/')) urlHint = 'svet';
  if (url.includes('/slovenija/') || url.includes('/lokalno/')) urlHint = 'slovenija';

  // B) TOČKOVANJE VSEBINE (Scoring)
  const scores: Record<CategoryId, number> = {
    slovenija: 0, svet: 0, kronika: 0, sport: 0, magazin: 0,
    lifestyle: 0, 'posel-tech': 0, moto: 0, kultura: 0, oglas: 0, ostalo: 0
  };

  const tokensToAnalyze: string[] = [];
  if (item.keywords && Array.isArray(item.keywords)) {
    tokensToAnalyze.push(...item.keywords.map(k => unaccent(k)));
  }
  if (item.categories && Array.isArray(item.categories)) {
     tokensToAnalyze.push(...item.categories.map(c => unaccent(c)));
  }
  // Vedno dodamo naslov za analizo, ker je tam največ informacij
  const combined = unaccent((item.title || '') + ' ' + (item.contentSnippet || ''));
  tokensToAnalyze.push(...combined.split(/\s+/).filter(w => w.length > 3));

  for (const token of tokensToAnalyze) {
      for (const cat of CATEGORIES) {
          const match = cat.keywords.some(configKw => {
              if (configKw.startsWith('/')) return false; 
              const cleanConfig = unaccent(configKw);
              
              if (token === cleanConfig) return true;
              if (token.includes(cleanConfig)) {
                  // Varovalka za kratke besede
                   if (cleanConfig.length < 4) return false;
                  return true; 
              }
              if (cleanConfig.includes(token) && token.length > 3) {
                  return true;
              }
              return false;
          });
          if (match) scores[cat.id]++;
      }
  }

  // C) IZBIRA ZMAGOVALCA
  let maxScore = 0;
  let bestCategory: CategoryId = 'ostalo';

  // Najprej preverimo, katera kategorija zmaga po točkah
  for (const id of PRIORITY_CHECK_ORDER) {
      if (scores[id] > maxScore) {
          maxScore = scores[id];
          bestCategory = id;
      }
  }

  // D) FINALNA ODLOČITEV (Kombinacija URL + Vsebina)
  
  // 1. Če imamo URL namig (Slovenija/Svet) ...
  if (urlHint) {
      // ... in je vsebina našla nekaj močnega (Kronika, Šport, Magazin) z vsaj 1 točko ...
      if (['kronika', 'sport', 'magazin', 'moto'].includes(bestCategory) && maxScore > 0) {
          return bestCategory; // ... potem VSEBINA povozi URL (tvoj primer: "umrl" -> Kronika)
      }
      // ... sicer obdržimo URL kategorijo (navadna politična novica)
      return urlHint;
  }

  // 2. Če URL ni dal ničesar, vrnemo zmagovalca po točkah
  if (maxScore > 0) {
      return bestCategory;
  }

  return 'ostalo';
}
