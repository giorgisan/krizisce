import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import type { NewsItem as FeedNewsItem } from '@/types'
import { CategoryId } from '@/lib/categories'

// --- KONFIGURACIJA ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
const CRON_SECRET = process.env.CRON_SECRET as string | undefined

// --- SUPABASE KLIENTI ---
// Za branje uporabimo anonimni ključ (javni dostop)
const supabaseRead = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

// Za pisanje (ingest) potrebujemo service role (če obstaja)
const supabaseWrite = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null

/* -------------------------------------------------------------------------- */
/* HELPER FUNKCIJE                                                            */
/* -------------------------------------------------------------------------- */

// Pretvorba DB vrstice v format za frontend
function rowToItem(r: any): FeedNewsItem {
  // Preferiramo 'publishedat' (number), fallback na 'published_at' (string), fallback na 'created_at'
  const ms = (r.publishedat && Number(r.publishedat)) || 
             (r.published_at ? Date.parse(r.published_at) : 0) || 
             (r.created_at ? Date.parse(r.created_at) : Date.now())
             
  return {
    title: r.title,
    link: r.link || '',
    source: r.source,
    image: r.image || null,
    contentSnippet: r.contentsnippet?.trim() || r.summary?.trim() || null,
    publishedAt: ms,
    isoDate: r.published_at || new Date(ms).toISOString(),
    category: (r.category as CategoryId) || 'ostalo',
  }
}

// "Soft" deduplikacija v spominu (če API vrne iste novice)
function softDedupe<T extends { link: string }>(arr: T[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []
  for (const item of arr) {
    if (!seen.has(item.link)) {
      seen.add(item.link)
      result.push(item)
    }
  }
  return result
}

/* -------------------------------------------------------------------------- */
/* TRENDING LOGIKA (Vroče novice)                                             */
/* -------------------------------------------------------------------------- */
// Poenostavljena logika za "Trending" - vzamemo zadnje, ki niso oglasi
async function fetchTrendingRows(): Promise<any[]> {
  const cutoffMs = Date.now() - 24 * 3600 * 1000 // Zadnjih 24 ur
  
  const { data, error } = await supabaseRead
    .from('news')
    .select('id, link, title, source, image, contentsnippet, summary, published_at, publishedat, category')
    .gt('publishedat', cutoffMs)
    .neq('category', 'oglas') 
    .order('publishedat', { ascending: false })
    .limit(50) // Vzamemo top 50 za analizo

  if (error) throw new Error(`DB trending: ${error.message}`)
  return data || []
}

/* -------------------------------------------------------------------------- */
/* API HANDLER                                                                */
/* -------------------------------------------------------------------------- */
type PagedOk = { items: FeedNewsItem[]; nextCursor: number | null }
type ListOk = FeedNewsItem[]
type Err = { error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PagedOk | ListOk | Err>,
) {
  try {
    const paged = req.query.paged === '1'
    const wantsFresh = req.query.forceFresh === '1'
    const sourceParam = (req.query.source as string) || null 
    const variant = (req.query.variant as string) || 'latest'
    const category = (req.query.category as string) || null
    const searchQuery = (req.query.q as string) || null 

    // --- 1. TRENDING (Vroče) ---
    if (variant === 'trending') {
      try {
        // Zaenkrat vrnemo samo najnovejše kot "trending", dokler nimaš kompleksne logike
        // (Tvoja prejšnja logika je bila OK, lahko jo vrneš, če želiš grupiranje)
        const rows = await fetchTrendingRows()
        const items = rows.map(rowToItem)
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60') 
        return res.status(200).json(items as any)
      } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Trending error' })
      }
    }

    // --- 2. INGEST (Samo če je avtorizirano) ---
    // To omogoča ročno osveževanje, če pokličeš z ?forceFresh=1 in pravim žetonom
    const headerSecret = (req.headers['x-cron-secret'] as string | undefined)?.trim()
    const isCronCaller = Boolean(CRON_SECRET && headerSecret && headerSecret === CRON_SECRET)
    const isDev = process.env.NODE_ENV !== 'production'
    
    if (wantsFresh && (isCronCaller || isDev) && supabaseWrite) {
      try {
        console.log('[API] Zaganjam fetchRSSFeeds...')
        // Tukaj dejansko pokličemo tvoj fetcher, ki uporablja adFilter in categories
        const rss = await fetchRSSFeeds({ forceFresh: true })
        
        if (rss?.length) {
           // Priprava za vpis v bazo (Upsert)
           const rows = rss.map(item => ({
              link: item.link,
              // Generiramo link_key za unikatnost (lahko preprosto URL)
              link_key: item.link, 
              title: item.title,
              source: item.source,
              image: item.image,
              contentsnippet: item.contentSnippet,
              summary: item.contentSnippet,
              published_at: item.isoDate,
              publishedat: item.publishedAt,
              category: item.category // To je že določeno v fetchRSSFeeds!
           }))

           const { error } = await supabaseWrite
             .from('news')
             .upsert(rows, { onConflict: 'link_key' })
           
           if (error) console.error('[API] DB Write Error:', error)
           else console.log(`[API] Uspešno posodobil ${rows.length} novic.`)
        }
      } catch (err) { 
          console.error('❌ RSS sync error:', err) 
      }
    }

    // --- 3. BRANJE NOVIC (Glavni del) ---
    const limitParam = parseInt(String(req.query.limit), 10)
    const defaultLimit = 25 
    const limit = Math.min(Math.max(limitParam || defaultLimit, 1), 100)
    const cursor = req.query.cursor ? Number(req.query.cursor) : null

    // Glavni query
    let q = supabaseRead
      .from('news')
      .select('id, link, title, source, image, contentsnippet, summary, published_at, publishedat, created_at, category')
      .gt('publishedat', 0)
      
      // FILTRIRANJE OGLASOV (Ključno!)
      .neq('category', 'oglas') 
      
    // SORTIRANJE
    q = q
      .order('publishedat', { ascending: false })
      .order('id', { ascending: false }) // Sekundarni sort za stabilnost

    // FILTRI
    if (sourceParam && sourceParam !== 'Vse') {
      const sources = sourceParam.split(',').map(s => s.trim()).filter(Boolean)
      if (sources.length > 0) q = q.in('source', sources)
    }
    
    if (cursor && cursor > 0) q = q.lt('publishedat', cursor)

    if (category && category !== 'vse') {
      if (category === 'ostalo') {
         q = q.or('category.is.null,category.eq.ostalo')
      } else {
         q = q.eq('category', category)
      }
    }

    if (searchQuery && searchQuery.trim().length > 0) {
        const term = searchQuery.trim()
        // Iščemo po naslovu ali vsebini
        q = q.or(`title.ilike.%${term}%,contentsnippet.ilike.%${term}%,summary.ilike.%${term}%`)
    }

    q = q.limit(limit)

    // IZVEDBA
    const { data, error } = await q
    if (error) return res.status(500).json({ error: `DB: ${error.message}` })

    const rows = (data || []) as any[]
    const rawItems = rows.map(rowToItem)
    
    // Še enkrat sortiranje (za vsak slučaj) in deduplikacija
    const items = softDedupe(rawItems).sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
    
    // Kursor za naslednjo stran
    const nextCursor = rows.length === limit ? (rows[rows.length - 1].publishedat ? Number(rows[rows.length - 1].publishedat) : null) : null

    // Cache control (hitro osveževanje za novice)
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30') 
    
    if (paged) return res.status(200).json({ items, nextCursor })
    return res.status(200).json(items)

  } catch (e: any) {
    console.error('[API Error]', e)
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
