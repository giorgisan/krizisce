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
  color: string // Tailwind barva za badge/indikator
  keywords: string[] // Iskanje po URL-ju in RSS tagih
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'slovenija',
    label: 'Slovenija',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    keywords: ['slovenija', 'politika', 'lokalno', 'občine', 'volitve', 'vlada', 'poslanci']
  },
  {
    id: 'svet',
    label: 'Svet',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    keywords: ['svet', 'tujina', 'evropa', 'zda', 'ukrajina', 'nato', 'eu', 'balkan']
  },
  {
    id: 'gospodarstvo',
    label: 'Gospodarstvo',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    keywords: ['gospodarstvo', 'posel', 'finance', 'borza', 'kripto', 'podjetja', 'delnice', 'nafta']
  },
  {
    id: 'sport',
    label: 'Šport',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    keywords: ['sport', 'nogomet', 'kosarka', 'tenis', 'kolesarstvo', 'zimski', 'atletika', 'rokomet']
  },
  {
    id: 'kronika',
    label: 'Črna kronika',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    keywords: ['kronika', 'crna-kronika', 'policija', 'sodisce', 'kriminal', 'promet', 'nesreca', 'gasilci']
  },
  {
    id: 'kultura',
    label: 'Kultura',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    keywords: ['kultura', 'umetnost', 'film', 'glasba', 'knjige', 'gledalisce', 'razstave']
  },
  {
    id: 'tech',
    label: 'Sci/Tech',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    keywords: ['znanost', 'tehnologija', 'auto', 'avtomoto', 'mobitel', 'vesolje', 'pametni', 'ai', 'digitalno']
  },
  {
    id: 'magazin',
    label: 'Magazin',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    keywords: ['magazin', 'popin', 'scena', 'zvezde', 'zabava', 'lifestyle', 'zdravje', 'kulinarika', 'moda', 'astro', 'tv', 'resničnostni']
  }
]

/**
 * Logika za določanje kategorije članka.
 * Preveri URL in RSS kategorije (tags).
 */
export function determineCategory(item: { link: string; categories?: string[] }): CategoryId {
  const url = item.link.toLowerCase()
  const tags = (item.categories || []).map(t => t.toLowerCase())
  const combined = [url, ...tags].join(' ')

  // 1. Prioriteta: Specifični URL segmenti (zelo natančno)
  // Če URL vsebuje /sport/, je skoraj zagotovo šport
  for (const cat of CATEGORIES) {
    // Preverimo URL segmente (npr. rtvslo.si/sport/)
    if (cat.keywords.some(k => url.includes(`/${k}/`) || url.includes(`/${k}`))) {
      return cat.id
    }
  }

  // 2. Prioriteta: RSS Kategorije in ključne besede v URL-ju
  for (const cat of CATEGORIES) {
    if (cat.keywords.some(k => combined.includes(k))) {
      return cat.id
    }
  }

  return 'ostalo'
}
