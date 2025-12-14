import { CategoryId } from './lib/categories'

export type NewsItem = {
  title: string
  link: string
  source: string
  image?: string | null
  contentSnippet?: string
  
  // Potrebno za RSS parsanje (api/news.ts), čeprav ne shranjujemo v bazo
  content?: string 
  
  // Potrebno za frontend (ArticleCard) kot fallback, če publishedAt manjka
  isoDate?: string | null
  pubDate?: string 
  
  /** Normaliziran čas objave (Unix ms). UI naj uporablja to polje. */
  publishedAt: number
  
  /** Kategorija novice (npr. 'sport', 'slovenija', ...) */
  category: CategoryId
}
