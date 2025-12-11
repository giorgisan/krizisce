import { CategoryId } from './lib/categories'

export type NewsItem = {
  title: string
  link: string
  source: string
  image?: string | null
  contentSnippet?: string
  content?: string
  pubDate?: string
  isoDate?: string
  /** Normaliziran čas objave (Unix ms). UI naj uporablja to polje. */
  publishedAt: number
  /** Kategorija novice (npr. 'sport', 'slovenija', ...) */
  category: CategoryId
}
