import { CategoryId } from './lib/categories' // Preveri pot

export type NewsItem = {
  title: string
  link: string
  source: string
  image?: string | null
  contentSnippet?: string
  content?: string
  pubDate?: string
  isoDate?: string
  publishedAt: number
  // NOVO:
  category: CategoryId
}
