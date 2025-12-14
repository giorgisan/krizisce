import { CategoryId } from './lib/categories'

export type NewsItem = {
  title: string
  link: string
  source: string
  image?: string | null
  contentSnippet?: string
  // content?: string // Tega v ArticleCard ne uporabljaš, lahko odstraniš
  
  /** Normaliziran čas objave (Unix ms). */
  publishedAt: number
  
  /** Kategorija novice */
  category: CategoryId
  
  // isoDate in pubDate smo v bazi brisali, tu ju lahko pustiš kot optional
  // samo, če ju rabiš za kakšno legacy logiko na frontendu (ArticleCard uporablja formattedDate iz publishedAt)
  isoDate?: string 
}
