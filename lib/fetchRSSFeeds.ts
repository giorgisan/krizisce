// /lib/fetchRSSFeeds.ts
import Parser from 'rss-parser'

const parser = new Parser()

const feeds: Record<string, string> = {
  '24ur': 'https://www.24ur.com/rss',
  'RTVSLO': 'https://img.rtvslo.si/feeds/00.xml',
  'Siol.net': 'https://siol.net/feeds/latest',
  'Zurnal24': 'https://www.zurnal24.si/feeds/latest',
  'Slovenske novice': 'https://www.slovenskenovice.si/rss',
  'Delo': 'https://www.delo.si/rss',
}

// 🔧 Nova različica funkcije za iskanje slik
function extractImage(item: any): string | undefined {
  // 1. enclosure
  if (item.enclosure?.url) return item.enclosure.url

  // 2. media:content
  if (item['media:content']?.url) return item['media:content'].url

  // 3. Išči <img src="..."> v content / description / contentSnippet
  const html = item.content || item.description || item.contentSnippet || ''
  const match = html.match(/<img[^>]+src="([^">]+)"/i)
  if (match && match[1]) return match[1]

  return undefined
}

export default async function fetchRSSFeeds() {
  const results: Record<string, any[]> = {}

  await Promise.all(
    Object.entries(feeds).map(async ([source, url]) => {
      try {
        const feed = await parser.parseURL(url)

        if (!feed.items || feed.items.length === 0) {
          console.warn(`⚠️  Vir ${source} ne vsebuje nobene novice.`)
          results[source] = []
          return
        }

        const parsed = feed.items.slice(0, 15).map(item => ({
          title: item.title || '',
          link: item.link || '',
          pubDate: item.pubDate || '',
          source,
          image: extractImage(item) || '/default-news.jpg',
        }))

        console.log(`✅ ${source}: ${parsed.length} člankov uspešno prebranih.`)
        results[source] = parsed
      } catch (err) {
        console.error(`❌ Napaka pri branju vira ${source}:`, err)
        results[source] = []
      }
    })
  )

  return results
}
