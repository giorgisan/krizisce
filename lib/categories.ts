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
        '/slovenija/', '/lokalno/', '/obcine/', '/regije/', '/okolje/', '/lokalne-novice/',
        'ljubljan', 'maribor', 'celj', 'koper', 'kranj', 'nov mest', 'velenj', 'mursk sobot',
        'obcin', 'zupan', 'svetnik', 'komunal', 'vodovod', 'kanalizacij', 'cest',
        'vlada', 'parlament', 'drzavni zbor', 'poslanc', 'ministr', 'premier', 'predsednik',
        'pirc musar', 'golob', 'jansa', 'tonin', 'mesec', 'fajon', 'logar', 
        'svoboda', 'sds', 'nsi', 'levica', 'sd',
        'referendum', 'ustavn sodisc', 'zakon', 'novel', 'soocenj', 'anket',
        'upokojenc', 'pokojnin', 'zpis', 'socialn transfer', 'minimaln plac', 'stavk', 'sindikat',
        'zdravstv', 'zdravstven dom', 'ukc', 'fides', 'cakaln dob', 'koncesij', 
        'solstv', 'ucitelj', 'matur', 'vpis', 'vrtec', 'solsk', 'ucenc', 'dijak', 'sol',
        'kmet', 'kmetij', 'gozdar', 'kgzs', 'zadrug', 'pridelek', 'trgatev',
        '/mnenja/', '/kolumne/', '/pisma/', '/bralci/',
        'vreme', 'arso', 'napoved', 'sneg', 'dez', 'neurj', 'toc', 'poplav', 'prah', 'onesnazen', 'zrak',
        'stopinj', 'celzi', 'najtoplejs', 'mraz', 'vroc', 'rekord',
        'dobrodeln', 'gasilsk zvez', 'sodnik', 'diskriminaci', 'rasizem', 'vrednot',
        'spominsk', 'slovesnost', 'volitva', 'zavest', 'sezigalnic', 'saniran', 'plaz', 'zaniman', 'obravnav', 'urban', 'redar', 'stepanjc', 'branj'
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
        'kitajsk', 'tajvan', 'korej', 'iran', 'teheran',
        'zda', 'bela hisa', 'trump', 'biden', 'harris', 'republikanc', 'demokrat', 'kongres',
        'eu', 'evropsk komisij', 'parlament', 'von der leyen', 'nato',
        'scholz', 'macron', 'orban', 'vucic', 'plenkovic',
        'potres', 'terorist', 'napad', 'protest', 'valut',
        'hrvask', 'zagreb', 'beograd', 'balkan', 'papez', 'vatikan', 'kralj'
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
        'rop', 'vlom', 'drzn', 'pretep', 'umor', 'uboj', 'truplo', 'utonil', 'mrtv', 'smrt',
        'sodisc', 'sojenj', 'zapor', 'pripor', 'obtoznic', 'obsodb',
        'pogresan', 'iskaln', 'helikopter', 'obmocj', 'voznik', 'alkohol',
        'petard', 'pirotehnik', 'poskodb', 'vinjen', 'vandal', 'oskrunjen', 'tragedij', 'groz',
        'nasil', 'tihotap', 'ponared', 'oskodoval', 'goljuf', 'begosunec', 'tiralic', 'poneverb'
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
        'boks', 'joshua', 'tyson', 'fury', 'olimpijsk', 'kolajn', 'drsalk', 'led'
    ]
  },
  {
    id: 'posel-tech',
    label: 'Posel & Tech',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: [
        '/gospodarstvo/', '/posel/', '/finance/', '/borza/', '/podjetnistvo/', '/tech/', '/znanost/', '/znanoteh/', '/posel-danes/',
        'delnic', 'kripto', 'bitcoin', 'ethereum', 'inflacij', 'obrest', 'ecb', 'euribor',
        'banka', 'nlb', 'nkbm', 'poslovanj', 'dobicek', 'izgub', 'stecaj', 'prihodk',
        'davk', 'furs', 'dohodnin', 'bilanc', 'subvencij', 'razpis', 'proracun',
        'bdp', 'recesij', 'investicij', 'vlagatelj', 'podjet', 'trg', 'nalozb',
        'energetik', 'hse', 'gen-i', 'lek', 'krka', 'petrol', 'mercator',
        'sindikat', 'zaposlitev', 'trg del', 'brezposelnost', 'plac', 'zasluzek', 'stavk', 'mercosur', 'sporazum', 'carin',
        'poklic', 'karier', 'siht', 'izvoz', 'panog', 'zbornic',
        'nepremicninski trg', 'stanovanjsk sklad', 'gradbenistv', 'novogradnj', 'nepremicnin',
        'naft', 'bencin', 'dizel', 'cen goriv', 'elektricn energij',
        'apple', 'iphone', 'samsung', 'xiaomi', 'huawei', 'sony', 'microsoft', 'google', 'meta', 'twitter',
        'umetn inteligenc', 'chatgpt', 'openai', 'robotik', 'vesolj', 'nasa', 'spacex', 'luna', 'mars', 'astronavt', 'misija',
        'aplikacij', 'programiranj', 'kibernetsk', 'heker', 'prevar', 'znanstven', 'splet', 'telef', 'mobiln', 'regulativ', 'direktiv', 'zasebnost', 'podatk',
        'milijard', 'milijonar', 'bogatas', 'bogastv', 'premozenj', 'uspeh',
        'gamers', 'igric', 'konzola', 'xbox', 'playstation', 'asus', 'racunalnik',
        'algorit', 'omrez', 'inovacij', 'partnerstv', 'bosch', 'studira', 'poklicev', 'gotovin'
    ]
  },
  {
    id: 'moto',
    label: 'Mobilnost', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    keywords: [
        '/auto/', '/avto/', '/avtomoto/', '/avtomobilno/', '/mobilnost/', '/svet-vozil/',
        'vozil', 'model', 'premier', 'test',
        'elektricn avto', 'tesla', 'byd', 'volkswagen', 'bmw', 'audi', 'mercedes', 'renault', 'toyota', 'dacia', 'volvo',
        'suv', 'terenec', 'limuzin', 'karavan', 'hibrid',
        'promet', 'dars', 'vinjet', 'predor', 'karavank', 'zastoj', 'radar', 'kazen',
        'voznja', 'voznik', 'tovornjak', 'avtocest', 'hrosc'
    ]
  },
  {
    id: 'magazin',
    label: 'Magazin',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    keywords: [
        '/magazin/', '/scena/', '/zvezde/', '/zabava/', '/zabava-in-slog/', '/znani/', '/traci/', '/bulvar/', '/ljudje/', '/popin/', '/zanimivosti/', '/trendi/', '/tuja-scena/', '/vip/', '/film-glasba-tv/', '/horoskop/',
        'kardashian', 'jenner', 'royal', 'kraljev', 'harry', 'meghan', 'william', 'kate',
        'jagger', 'madonna', 'shakira', 'swift', 'beyonc', 'severin', 'prijovic', 'lepa bren', 'ceca',
        'chal', 'bas', 
        'znani', 'vplivnez', 'influencer', 'estradnik', 'zvezdnic', 'zvezdnik', 'ikon', 'bardot', 'klum',
        'clooney', 'dick', 'dyke', 
        'locitev', 'poroka', 'nosecnost', 'afera', 'skandal', 'mladoporoc', 'zaroka', 'nosec', 'baby',
        'kmetija', 'sanjski', 'talent', 'zvezde plesejo', 'masterchef', 'evrovizij', 'ema', 'sov', 'resnicnostn',
        'kviz', 'joker', 'milijonar', 'kolo srece', 'voditelj', 'resnicnostn', 'serij', 'film', 'netflix', 'suzy',
        'horoskop', 'astro', 'zodiak', 'retrogradn', 'merkur', 'luna', 'scip', 'znamenj',
        'prerok', 'nostradamus', 'vanga', 'napoved', 'srhljiv', 'katastrof', 
        'viral', 'smesn', 'video', 'sokantn', 'ganljiv', 'tiktok', 'razhod', 
        'pev', 'igral', 'resnicnost', 'karikatur',
        'televizi', 'oddaj', 'spored', 'planet tv', 'pop tv', 'rtv', 'grsk', 'otok', 'samsk', 'zaroc', 'loterij', 'zadel', 'milijon', 'sercic', 'afna', 'kopalkah', 'olimpijk', 'kelce', 'fantomsk', 'hmelbojs', 'rokenrol'
    ]
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    keywords: [
        '/zdravje/', '/dobro-pocutje/', '/duhovnost/', '/stil/', '/osebna-rast/', '/bivanje/', '/trajnostno/', '/kulinarika/', '/okusno/', '/dom/', '/druzina-in-odnosi/', '/aktivni-in-zdravi/', '/astro/', '/vrt/', '/mama/',
        'bolezen', 'simptom', 'zdravnik', 'rak', 'srce', 'diabetes', 'tlak', 'holesterol', 'ledvic', 'jetra', 'prebav',
        'hujsanj', 'diet', 'vadba', 'fitnes', 'joga', 'stres', 'izgorel', 'spanj', 'nespecnost',
        'vitamin', 'mineral', 'imunsk', 'prehlad', 'grip', 'covid', 'virus', 'okuzb', 'demenc', 'mozgan', 'savn',
        'recept', 'kosilo', 'vecerja', 'sladica', 'pecivo', 'tort', 'kuhanj', 'pecenj', 'hran', 'okus', 'caj', 'kava', 'napitek',
        'sestavin', 'jed', 'gastronom', 'michelin', 'juh', 'solat', 'kis', 'zelj', 'sarm', 'potic',
        'hisa', 'stanovan', 'interier', 'oprema', 'prenova', 'dekoracij', 'dom', 'vrt',
        'vrtnar', 'rastlin', 'cvet', 'zelenjav', 'sadn',
        'soncn elektrarn', 'toplotn', 'energetsk ucinkovit', 'ekolog', 'trajnost',
        'ciscenj', 'pospravljanj', 'triki', 'nasvet', 'plastik', 'posod',
        'luck', 'okrask', 'smrecic', 'jelk', 'praznicn', 'bozic', 'daril', 'obdarovan', 'dedek mraz', 'prazni',
        'poraba', 'varcevanj',
        'odnos', 'partner', 'samsk', 'zmenk', 'toksic', 'custv', 'psiholog', 'razmerj', 'vzgoj',
        'locitev', 'razhod', 'sreca', 'zadovoljstv', 'osamljen', 'dusn', 'dusa', 'motivacij', 'intuicij',
        'zival', 'ljubljenck', 'pes', 'psi', 'mack', 'zavetisc', 'posvojit', 'cebel', 'medved',
        '/potovanja/', '/izleti/', '/turizem/', 
        'dopust', 'pocitnic', 'morje', 'hrib', 'izlet', 'hotel', 'kamp', 'razgled', 'potep', 'turizem', 'turist', 'destinacij', 'wellness', 'razvajanj', 'term',
        'huj', 'navad', 'vitaln',
        'trebuh', 'mascob', 'misic', 'telovad', 'staran', 'utrujenost', 'teles',
        'imen', 'stars', 'otrok', 'medenicn', 'nozev', 'gradn', 'hise', 'prepir', 'pijac', 'hidraci', 'hladilnik', 'vzigalic', 'stranisc', 'pustn', 'meduz', 'vnuk', 'babic', 'dedk', 'spolni', 'penetracija', 'ejakulacija', 'samostan', 'zelisc'
    ]
  },
  {
    id: 'kultura',
    label: 'Kultura',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    keywords: [
        '/kultura/', '/umetnost/', '/knjige/', '/film/', '/glasba/', '/gledalisce/', '/mlado-pero/',
        'razstav', 'muzej', 'galerij', 'slikar', 'kip', 'umetnik',
        'fotograf', 'objektiv', 'posnetek', 'kadr', 
        'koncert', 'opera', 'balet', 'filharmonij', 'zbor',
        'kino', 'premier', 'oskar', 'cannes', 'liffe', 'sarajevo film',
        'knjizn', 'pisatelj', 'pesnik', 'roman', 'zbirk', 'proz', 'literarn', 'recenzi',
        'dokumentarec', 'karikatur', 'strip', 'reziser', 'umetnin', 'mojstrov',
        'pevec', 'skupin', 'bend', 'parni valjak', 'glasben'
    ]
  }
]

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

export function determineCategory(item: { 
  link: string; 
  title?: string; 
  contentSnippet?: string; 
  categories?: string[];
  keywords?: string[]; 
}): CategoryId {
  
  const url = item.link.toLowerCase();
  
  // 1. SPECIFIČNI URL FILTRI (Early Exit - če piše /sport/, je sport in pika)
  if (url.includes('/kronika/') || url.includes('/crna-kronika/') || url.includes('/crna/')) return 'kronika';
  if (url.includes('/sport/') || url.includes('/sportal/') || url.includes('/nogomet/') || url.includes('/kosarka/') || url.includes('/zimski-sporti/')) return 'sport';
  if (url.includes('/avto/') || url.includes('/avtomoto/') || url.includes('/avtomobilno/') || url.includes('/mobilnost/') || url.includes('/svet-vozil/')) return 'moto';
  if (url.includes('/magazin/') || url.includes('/bulvar/') || url.includes('/scena/') || url.includes('/zvezde/') || url.includes('/popin/') || url.includes('/karikatura/') || url.includes('/zabava/') || url.includes('/zabava-in-slog/') || url.includes('/znani/') || url.includes('/trendi/') || url.includes('/zanimivosti/') || url.includes('/tuja-scena/') || url.includes('/vip/') || url.includes('/film-glasba-tv/') || url.includes('/horoskop/')) return 'magazin';
  if (url.includes('/lifestyle/') || url.includes('/zdravje/') || url.includes('/okusno/') || url.includes('/kulinarika/') || url.includes('/dom/') || url.includes('/osebna-rast/') || url.includes('vizita') || url.includes('/trajnostno/') || url.includes('/bivanje/') || url.includes('/stil/') || url.includes('/druzina-in-odnosi/') || url.includes('/aktivni-in-zdravi/') || url.includes('/astro/') || url.includes('/vrt/') || url.includes('/mama/')) return 'lifestyle';
  if (url.includes('/kultura/') || url.includes('/glasba/') || url.includes('/mlado-pero/') || url.includes('/umetnost/') || url.includes('/knjige/')) return 'kultura';
  if (url.includes('/gospodarstvo/') || url.includes('/posel/') || url.includes('/finance/') || url.includes('/digisvet/') || url.includes('/tech/') || url.includes('/znanoteh/') || url.includes('/zaposlitev/') || url.includes('/potrosnik/') || url.includes('/posel-danes/')) return 'posel-tech';

  let urlHint: CategoryId | null = null;
  if (url.includes('/svet/') || url.includes('/tujina/')) urlHint = 'svet';
  // Vsi mnenjski in lokalni segmenti gredo pod Slovenijo, razen če keywords rečejo drugače
  if (url.includes('/slovenija/') || url.includes('/lokalno/') || url.includes('/lokalne-novice/') || url.includes('/mnenja/') || url.includes('/kolumne/') || url.includes('/pisma/') || url.includes('/bralci/') || url.includes('/okolje/') || url.includes('/obcine/') || url.includes('/regije/') || url.includes('/ljubljan/') || url.includes('/maribor/') || url.includes('/celje/') || url.includes('/koper/') || url.includes('/kranj/') || url.includes('/nov-mesto/') || url.includes('/velenje/') || url.includes('/murska-sobota/') || url.includes('/gorisko/') || url.includes('/primorje/') || url.includes('/izpostavljeno/')) urlHint = 'slovenija';

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
  const combined = unaccent((item.title || '') + ' ' + (item.contentSnippet || ''));
  tokensToAnalyze.push(...combined.split(/\s+/).filter(w => w.length > 3));

  for (const token of tokensToAnalyze) {
      for (const cat of CATEGORIES) {
          const match = cat.keywords.some(configKw => {
              if (configKw.startsWith('/')) return false; 
              const cleanConfig = unaccent(configKw);
              if (token.includes(cleanConfig)) {
                  if (cleanConfig.length < 5) {
                      return token === cleanConfig || token.startsWith(cleanConfig);
                  }
                  return token.startsWith(cleanConfig) || token.endsWith(cleanConfig);
              }
              if (cleanConfig.includes(token) && token.length > 3) {
                  return true;
              }
              return false;
          });
          if (match) scores[cat.id]++;
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

  if (urlHint) {
      if (['kronika', 'sport', 'magazin', 'moto', 'lifestyle', 'posel-tech', 'kultura'].includes(bestCategory) && maxScore > 0) {
          return bestCategory; 
      }
      return urlHint;
  }

  if (maxScore > 0) {
      return bestCategory;
  }

  return 'ostalo';
}
