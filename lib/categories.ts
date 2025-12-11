export type CategoryId = 
  | 'slovenija' 
  | 'svet' 
  | 'sport' 
  | 'gospodarstvo' 
  | 'kultura' 
  | 'kronika' 
  | 'magazin' 
  | 'tech' 
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
      'slovenija', 'lokalno', 'občine', 'volitve', 'vlada', 'poslanci', 'upokojenci', 'zdravstvo', 
      'soočenja', 'referendum', 'državni zbor', '/novice/slovenija'
    ]
  },
  {
    id: 'svet',
    label: 'Svet',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    keywords: [
      'svet', 'tujina', 'evropa', 'zda', 'ukrajina', 'nato', 'eu', 'balkan', 'rusija', 'vojna',
      'trump', 'putin', 'globus', '/novice/svet'
    ]
  },
  {
    id: 'gospodarstvo',
    label: 'Gospodarstvo',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: [
      'gospodarstvo', 'posel', 'finance', 'borza', 'kripto', 'podjetja', 'delnice', 'nafta', 
      'banke', 'nepremičnine', 'cekin', 'posel-danes', 'podjetništvo'
    ]
  },
  {
    id: 'sport',
    label: 'Šport',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    keywords: [
      'sport', 'sportal', 'nogomet', 'kosarka', 'tenis', 'kolesarstvo', 'zimski', 'atletika', 'rokomet',
      'odbojka', 'moto', 'f1', 'nba', 'ekipa', 'snportal', 'ligaprvakov'
    ]
  },
  {
    id: 'kronika',
    label: 'Črna kronika',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    keywords: [
      'kronika', 'crna-kronika', 'črna kronika', 'policija', 'sodisce', 'kriminal', 'promet', 
      'nesreca', 'gasilci', 'umor', 'nasilje', 'preiskava'
    ]
  },
  {
    id: 'kultura',
    label: 'Kultura',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    keywords: [
      'kultura', 'umetnost', 'film', 'glasba', 'knjige', 'gledalisce', 'razstave', 'oder', 
      'literatura', 'koncert'
    ]
  },
  {
    id: 'tech',
    label: 'Sci/Tech',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    keywords: [
      'znanost', 'tehnologija', 'auto', 'avtomoto', 'mobitel', 'vesolje', 'pametni', 'ai', 
      'digitalno', 'internet', 'digisvet', 'znanstveni', 'telefoni', 'aplikacije', 'volan'
    ]
  },
  {
    id: 'magazin',
    label: 'Magazin',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    keywords: [
      'magazin', 'popin', 'scena', 'zvezde', 'zabava', 'lifestyle', 'zdravje', 'kulinarika', 
      'moda', 'astro', 'tv', 'resničnostni', 'trači', 'bulvar', 'zanimivosti', 'trendi', 'lepota',
      'dobro jutro', 'kmetija', 'sanjski moški', 'vizita', 'okusno'
    ]
  }
]

export function determineCategory(item: { link: string; categories?: string[] }): CategoryId {
  const url = item.link.toLowerCase()
  const tags = (item.categories || []).map(t => t.toLowerCase())
  const combined = [url, ...tags].join(' ')

  // 1. Prioriteta: Preveri URL segmente (zelo zanesljivo)
  for (const cat of CATEGORIES) {
    // Preverimo če URL vsebuje ključne besede (npr. /sport/, /sportal/)
    if (cat.keywords.some(k => url.includes(k))) {
      return cat.id
    }
  }

  // 2. Prioriteta: Če URL ne da odgovora, preveri še RSS tage
  for (const cat of CATEGORIES) {
    if (tags.some(t => cat.keywords.some(k => t.includes(k)))) {
      return cat.id
    }
  }

  return 'ostalo'
}
