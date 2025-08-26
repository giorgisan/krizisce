// types.ts
export type NewsItem = {
  title: string
  link: string
  source: string
  image: string | null
  content: string
  contentSnippet: string
  isoDate: string
  pubDate: string
  /** Normaliziran čas objave (unix ms) – uporabljaj za sort in logiko */
  publishedAt: number
}
