// lib/categories.ts

export type CategoryId =
  | 'slovenija'
  | 'svet'
  | 'kronika'       // Vrnjeno!
  | 'sport'
  | 'gospodarstvo'
  | 'moto'          // Vrnjeno!
  | 'tehnologija'   // Preimenovano iz 'tech' za lepši izpis, a logika ostaja
  | 'zdravje'       // Novo, ločeno od Magazina za boljše filtriranje
  | 'magazin'
  | 'kultura'
  | 'ostalo';

export interface Category {
  id: CategoryId;
  label: string;
  keywords: string[];
  priority: number; // Manjša številka = preveri prej
  color: string;
}

// Pomožna funkcija za odstranjevanje šumnikov (iz tvoje stare kode)
const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const CATEGORIES: Category[] = [
  {
    id: 'kronika',
    label: 'Kronika',
    // Visoka prioriteta, da povozi "Slovenijo"
    priority: 1, 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    keywords: [
      '/kronika/', '/crna-kronika/', 
      'policija', 'gasilci', 'nesreca', 'umor', 'sodisce', 
      'kriminal', 'tragicno', 'sojenje', 'napad', 'rop', 'ukradla', 'zapornik', 'zapor', 
      'panika', 'pretep', 'droge', 'kokain', 'mamil', 'tihotap', 'aretacija', 'trcenje', 'smrt'
    ]
  },
  {
    id: 'moto',
    label: 'Avto',
    priority: 2,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    keywords: [
      '/auto/', '/avto/', 
      '/avtomobilnost/', '/avtomobilno/', '/avtomoto/', '/svet-vozil/',     
      '/mobilnost/', '/motociklizem/', '/avtomotosport/', 
      'vozila', 'promet', 'elektricna-vozila', 'testi', 
      'avtomobilizem', 'volkswagen', 'bmw', 'audi', 'tesla', 'dizel', 'bencin', 'hibrid',
      'suv', 'limuzina', 'karavan', 'renault', 'toyota', 'peugeot', 'skoda', 'mercedes', 'porsche', 'volvo', 'fiat',
      'cupra', 'geely', 'byd', 'mazda', 'lexus', 'citroen', 'kia', 'ford', 'opel',
      'formula-1', 'f1', 'verstappen', 'hamilton', 'rally', 'moto-gp', 'dirka', 
      'motorji', 'zgorevanjem', 'avtomobilska-industrija', 'vinjeta', 'dars'
    ]
  },
  {
    id: 'sport',
    label: 'Šport',
    // Prioriteta 3, da ujame "Bayern" preden pade v Magazin (Nedelo)
    priority: 3, 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    keywords: [
      '/sport/', '/sportal/', 
      'nogomet', 'nogometni', // Fix za Bayern
      'kosarka', 'zimski', 'atletika', 'kolesarstvo', 'tenis', 
      'ekipa24', 'sport.n1info.si', 'odbojka', 'rokomet', 'nhl', 'nba', 'doncic', 'kopitar', 
      'pogacar', 'roglic', 'messi', 'olimpij', 'liga', 'prvenstvo', 'trener', 'reprezentanca', 'tekma',
      'bayern', 'munchen', 'uefa', 'fifa', 'smučanje', 'skoki'
    ]
  },
  {
    id: 'tehnologija',
    label: 'Tehnologija',
    priority: 4,
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    keywords: [
      '/znanost/', '/tehnologija/', '/tech/', '/digisvet/', '/znanost-in-tehnologija/', '/digitalna-odpornost/',
      'vesolje', 'telefoni', 'racunalnistvo', 'znanost', 'pametni', 
      'umetna-inteligenca', 'ai', 
      'apple', 'samsung', 'google', 'microsoft', 'nvidia', 'chatgpt', 'openai', 'xiaomi', 'huawei',
      'inovacije', 'razvoj', 'digitalno', 'nasa', 'spacex', 'astronomija', 'mars', 'rover', 'komet',
      'aplikacija', 'internet', 'kibernet', 'odkritje', 'dnk', 'raziskav', 'znanstveniki', 'studija'
    ]
  },
  {
    id: 'zdravje',
    label: 'Zdravje',
    priority: 5, // Pred Magazinom!
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    keywords: [
      '/zdravje/', 'medicina', 'zdravnik', 'bolnis', 'bolezen', 'virus', 'covid', 'gripa', 
      'rak', 'srce', 'mozgan', 'prehrana', 'dieta', 'hujsanje', 'vitamin', 'rekreacija',
      'bakterije', 'alergije', 'prebav', 'kosti', 'zivilo', 'superzelenjava', 'ambulanta'
    ]
  },
  {
    id: 'gospodarstvo',
    label: 'Gospodarstvo',
    priority: 6,
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: [
      '/gospodarstvo/', '/posel/', '/finance/', '/borza/', 'kripto', 'delnice', 'podjetnistvo', 
      'banke', 'druzbe', 'posel-danes', 'gospodarstvo', 'inflacija', 'bitcoin', 'evro', 
      'zaposlitev', 'sluzba', 'odpustili', 'delavec', 'poklic', 'podjetje', 'direktor', 'stecaj',
      'energetika', 'elektrika', 'podrazitev', 'mastercard', 'nlb', 'prihodki'
    ]
  },
  {
    id: 'magazin',
    label: 'Magazin',
    priority: 7, // Pobere vse "mehke" teme (Nedeljski, trači, horoskop)
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    keywords: [
      '/magazin/', '/popin/', '/trendi/', '/scena/', '/zvezde/', '/zabava/', 
      '/lifestyle/', '/kulinarika/', '/okusno/', '/astro/', 'suzy', 'lady', 'dom-in-vrt',
      '/nedeljski/', // FIX ZA DNEVNIK
      'prosti-cas', 'nedeljski', 'izleti', 'dobro-pocutje', '/ture-avanture/',
      '/bulvar/', '/tuji-traci/', '/domaci-traci/', '/ljudje/', '/stil/', '/zanimivosti/',
      '/zabava-in-slog/', 'svet-zavoda', 'na-lepse', 'vrt', 'recepti', 
      'horoskop', 'astro', 'zvezd', // Fix za Astro
      '/tv-oddaje/', 'resnicnostni-sov', 'kmetija', 'ljubezen-po-domace', 'sanjski-moski', 'poroka-na-prvi-pogled', 'slovenija-ima-talent',
      '/znani/', '/osebna-rast/', '/nedeljske-novice/', '/lepota-bivanja/', '/napovedujemo/',
      'senidah', 'koncert', 'stozice', 'evrovizij', 'ema',
      'noseca', 'pricakuje-otroka', 'zvezdnik', 'partner', 'poroka', 'locitev',
      'custva', 'psihologija', 'sreca', 'odnosi', 'seks',
      '/dom/', '/dekor/', '/gospodinjstvo/', '/gradnja-obnova/', '/pod-streho/',
      '/med-ljudmi/', '/zakulisje/', '/aktualno/',
      'recept', 'kosilo', 'sladica', 'kuhar', 'jedilnik', 
      'potovanje', 'izlet', 'popotnik', 'dozivetje', 'turist',
      'gradnja', 'hisna', 'vrtnarjenje', 'ciscenje', 'madezi', 'triki', 'rastline',
      'bozic', 'prazniki', 'darila', 'jelka', 'okraski', 'advent',
      'vplivnez', 'moda', 'lepota', 'manekenka', 'kraljeva',
      'upokojen', 'senior', 'starost',
      'coach', 'trener', 'cilj', 'motivacija', 'uspeh', 'karier', 'navdih', 'zadovoljstvo',
      'viral', 'posnetek'
    ]
  },
  {
    id: 'kultura',
    label: 'Kultura',
    priority: 8,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    keywords: [
      '/kultura/', '/kultur/', 'film', 'glasba', 'knjige', 'razstave', 'gledalisce', 
      'umetnost', 'festival', 'literatura', 'oder', 
      'pisatelj', 'pesnik', 'slikar', 'igralec', 'premiera', 'kino',
      'bralne-urice', 'portret', 'intervju', 'dokumentarni-film', 'reziser',
      'muzej', 'dediscina', 'zgodovina', 'orkester', 'koncert', 'opera', 'balet',
      'knjizni-sejem', 'liffe', 'animateka', 'grammy', 'oskar'
    ]
  },
  {
    id: 'svet',
    label: 'Svet',
    priority: 9,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    keywords: [
      '/svet/', '/tujina/', '/evropa/', '/zda/', 'ukrajina', 'rusija', 'vojna', 'nato', 'trump', 
      '/novice/svet/', 'zunanja-politika', 'eu', 'bliznji-vzhod', 'gaza', 'izrael',
      'evropska-unija', 'evropski-parlament', 'scholz', 'macron', 'biden', 'putin', 'zelenski'
    ]
  },
  {
    id: 'slovenija',
    label: 'Slovenija',
    priority: 10, // Catch-all za lokalno
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    keywords: [
      '/slovenija/', '/lokalno/', '/obcine/', '/volitve/', 'vlada', 'poslanci', 
      '/novice/slovenija/', 'domovina', 'notranja-politika',
      'ljubljana', 'maribor', 'celje', 'koper', 'kranj', 'novo-mesto', 'velenje', 'vrhnika', 'postojna', 'kocevje', 'ptuj',
      'regije', 'slovenij', '/lokalne-novice/', '/stajerska/', '/dolenjska/', '/primorska/', '/gorenjska/', '/prekmurje/', '/koroska/',
      '/mnenja/', '/pisma-bralcev/', '/sobotna-priloga/', '/kolumne/', '/bralci/',
      'javna-uprava', 'drzavni-zbor', 'zupan', 'obcina', 'studentski-dom', 'fakultet',
      'prenova', 'gradnja', 'vodovod', 'vrtec', 'sola', 'cesta', 'zeleznica', 'drugi-tir', 'prometna-infrastruktura',
      'vreme', 'arso', 'vremenska', 'sneg', 'dezevje', 'poplave', 'neurje', 'toča', 'ciklon', 'temperatura',
      'humanitarn'
    ]
  },
  {
    id: 'ostalo',
    label: 'Ostalo',
    priority: 99,
    keywords: [],
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  }
];

export function determineCategory(item: { title: string; link: string; description?: string; contentSnippet?: string }): CategoryId {
  // 1. Pripravimo tekst za iskanje (vse z malimi črkami in BREZ ŠUMNIKOV)
  // Uporabimo tvojo staro 'unaccent' funkcijo za večjo natančnost
  const fullText = unaccent(`${item.title} ${item.link} ${item.description || ''} ${item.contentSnippet || ''}`);
  
  // 2. Gremo skozi kategorije po prioriteti (1, 2, 3...)
  const sortedCategories = [...CATEGORIES].sort((a, b) => a.priority - b.priority);

  for (const category of sortedCategories) {
    if (category.id === 'ostalo') continue;

    // Preverimo vsako ključno besedo
    for (const keyword of category.keywords) {
      // Tudi ključno besedo očistimo šumnikov za primerjavo
      const cleanKeyword = unaccent(keyword);
      if (fullText.includes(cleanKeyword)) {
        return category.id;
      }
    }
  }

  return 'ostalo';
}
