import { CategoryId } from './lib/categories'

export type NewsItem = {
  title: string
  link: string
  source: string
  image?: string | null
  contentSnippet?: string
  
  // TOLE VRNI NAZAJ (odkomentiraj):
  content?: string 
  
  // Te lahko pustiš, če jih koda za RSS potrebuje za začasno hrambo
  pubDate?: string
  isoDate?: string
  
  /** Normaliziran čas objave (Unix ms). UI naj uporablja to polje. */
  publishedAt: number
  
  /** Kategorija novice (npr. 'sport', 'slovenija', ...) */
  category: CategoryId
}
