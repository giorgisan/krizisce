import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import type { NewsItem as FeedNewsItem } from '@/types'
import { determineCategory, CategoryId } from '@/lib/categories'
import { generateKeywords } from '@/lib/textUtils'

// --- KONFIGURACIJA ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
const CRON_SECRET = process.env.CRON_SECRET as string | undefined

// --- SUPABASE KLIENTI ---
const supabaseRead = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})
const supabaseWrite = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null

/* -------------------------------------------------------------------------- */
/* HELPER FUNKCIJE (Potrebne za ingest in splošni API)                        */
/* -------------------------------------------------------------------------- */

function cleanUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim())
    u.protocol = 'https:'
    u.host = u.host.toLowerCase().replace(/^www\./, '')
    const TRACK = [/^utm_/i, /^fbclid$/i, /^gclid$/i, /^ref$/i, /^src$/i, /^from$/i, /^si_src$/i, /^mc_cid$/i, /^mc_eid$/i]
    for (const [k] of Array.from(u.searchParams.entries())) {
      if (TRACK.some((rx) => rx.test(k))) u.searchParams.delete(k)
    }
    u.pathname = u.pathname.replace(/\/amp\/?$/i, '/')
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, '')
    u.hash = ''
    if (u.host.endsWith('rtvslo.si')) u.host = 'rtvslo.si'
    return u
  } catch { return null }
}

function yyyymmdd(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(+d)) return null
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${dd}`
}

function makeLinkKey(raw: string, iso?: string | null): string {
  const u = cleanUrl(raw)
  if (!u) return raw.trim()
  const nums: string[] = []
  const pathNums = u.pathname.match(/\d{6,}/g)
  if (pathNums) nums.push(...pathNums)
  for (const [, v] of Array.from(u.searchParams.entries())) {
    if (/^\d{6,}$/.test(v)) nums.push(v)
    const inner = v.match(/\d{6,}/g)
    if (inner) nums.push(...inner)
  }
  const numericId = nums.sort((a, b) => b.length - a.length)[0]
  if (numericId) return `https://${u.host}/a/${numericId}`
  const parts = u.pathname.split('/').filter(Boolean)
  let last = parts.length ? parts[parts.length - 1] : ''
  last = last.replace(/\.[a-z0-9]+$/i, '')
  const day = yyyymmdd(iso) ?? ''
  if (last && day) return `https://${u.host}/a/${day}-${last.toLowerCase()}`
  if (last) return `https://${u.host}/a/${last.toLowerCase()}`
  return `https://${u.host}${u.pathname}`
}

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normTitle = (s: string) => unaccent(s).toLowerCase().replace(/\s+/g, ' ').trim()

// OPTIMIZACIJA 1: Izboljšan softDedupe
function softDedupe<T extends { source?: string; title?: string; publishedAt?: number }>(arr: T[]): T[] {
  const byKey = new Map<string, T>()
  for (const it of arr) {
    const key = `${(it.source || '').trim()}|${normTitle(it.title || '')}`
    const prev = byKey.get(key)
    if (!prev || (it.publishedAt || 0) > (prev.publishedAt || 0)) {
      byKey.set(key, it)
    }
  }
  return Array.from(byKey.values())
}

function normalizeSnippet(item: FeedNewsItem): string | null {
  const snippet = (item.contentSnippet || '').trim()
  if (snippet) return snippet
  const fromContent = ((item as any).content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return fromContent || null
}

function resolveTimestamps(item: FeedNewsItem) {
  const parse = (value?: string | null) => {
    if (!value) return null
    const t = Date.parse(value)
    if (Number.isNaN(t)) return null
    return { raw: value, ms: t, iso: new Date(t).toISOString() }
  }
  const fromIso = parse(item.isoDate)
  const fromPub = parse((item as any).pubDate)
  const msFromNumber = typeof item.publishedAt === 'number' && Number.isFinite(item.publishedAt) && item.publishedAt > 0 ? item.publishedAt : null
  const ms = fromIso?.ms ?? fromPub?.ms ?? msFromNumber ?? Date.now()
  const iso = fromIso?.iso ?? fromPub?.iso ?? new Date(ms).toISOString()
  return { ms: Math.round(ms), iso }
}

function feedItemToDbRow(item: FeedNewsItem) {
  const linkRaw = (item.link || '').trim()
  const ts = resolveTimestamps(item)
  const linkKey = makeLinkKey(linkRaw, ts.iso)
  const title = (item.title || '').trim()
  const source = (item.source || '').trim()
  if (!linkKey || !title || !source) return null
  const snippet = normalizeSnippet(item)
  
  const category = item.category || determineCategory({ 
    link: linkRaw, 
    title: title, 
    contentSnippet: snippet || '', 
    categories: [] 
  })

  let kws = item.keywords;
  if (!kws || kws.length === 0) {
      const text = title + ' ' + (snippet || '');
      kws = generateKeywords(text);
  }

  return {
    link: linkRaw,
    link_key: linkKey,
    title,
    source,
    image: item.image?.trim() || null,
    contentsnippet: snippet,
    summary: snippet,
    published_at: ts.iso,
    publishedat: ts.ms,
    category: category, 
    keywords: kws, 
  }
}

async function syncToSupabase(items: FeedNewsItem[]) {
  if (!supabaseWrite) return
  
  const shaped = items.map((i) => {
    const t = resolveTimestamps(i)
    return { ...i, title: i.title || '', source: i.source || '', publishedAt: t.ms }
  })
  
  const dedupedIn = softDedupe(shaped)
  const rows = dedupedIn.map(feedItemToDbRow).filter(Boolean) as any[]
  
  if (!rows.length) return

  if (process.env.NODE_ENV !== 'production' || rows.length > 0) {
      console.log(`[Sync] Pripravljenih ${rows.length} vrstic za vpis.`)
  }

  const { error } = await (supabaseWrite as any)
    .from('news')
    .upsert(rows, { onConflict: 'link_key' }) 
  
  if (error) {
      console.error('[Sync] DB Error:', error)
      throw error
  }
}

type Row = {
  id: number
  link: string
  link_key: string | null
  title: string
  source: string
  image: string | null
  contentsnippet: string | null
  summary: string | null
  published_at: string | null
  publishedat: number | null
  created_at: string | null
  category: string | null
  keywords: string[] | null 
}

const toMs = (s?: string | null) => {
  if (!s) return 0
  const v = Date.parse(s)
  return Number.isFinite(v) ? v : 0
}

function rowToItem(r: Row): FeedNewsItem {
  const ms = (r.publishedat && Number(r.publishedat)) || toMs(r.published_at) || toMs(r.created_at) || Date.now()
  return {
    title: r.title,
    link: r.link || '',
    source: r.source,
    image: r.image || null,
    contentSnippet: r.contentsnippet?.trim() || r.summary?.trim() || null,
    publishedAt: ms,
    isoDate: r.published_at || null,
    category: (r.category as CategoryId) || 'ostalo',
    keywords: r.keywords || [] 
  }
}

/* -------------------------------------------------------------------------- */
/* API HANDLER                                                                */
/* -------------------------------------------------------------------------- */
type PagedOk = { items: FeedNewsItem[]; nextCursor: number | null }
type ListOk = FeedNewsItem[]
type Err = { error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PagedOk | ListOk | Err | { message: string } | { success: boolean; message: string }>,
) {
  try {
    const paged = req.query.paged === '1'
    const wantsFresh = req.query.forceFresh === '1'
    const sourceParam = (req.query.source as string) || null 
    const variant = (req.query.variant as string) || 'latest'
    const category = (req.query.category as string) || null
    const searchQuery = (req.query.q as string) || null 
    const tagQuery = (req.query.tag as string) || null 

    // --- 1. TRENDING (BRANJE IZ CACHE-A) ---
    if (variant === 'trending') {
      try {
        const { data } = await supabaseRead
            .from('trending_groups_cache')
            .select('data')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single()
            
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30')
        return res.status(200).json(data?.data || [])
      } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Trending error' })
      }
    }

    // --- 2. INGEST LOGIKA (Cron) ---
    const headerSecret = (req.headers['x-cron-secret'] as string | undefined)?.trim()
    const isCronCaller = Boolean(CRON_SECRET && headerSecret && headerSecret === CRON_SECRET)
    const isInternalIngest = req.headers['x-krizisce-ingest'] === '1'
    const isDev = process.env.NODE_ENV !== 'production'
    const tokenOk = CRON_SECRET && req.query.token === CRON_SECRET
    const allowPublic = process.env.ALLOW_PUBLIC_REFRESH === '1'
    const canIngest = isCronCaller || isInternalIngest || isDev || tokenOk || allowPublic

    // POPRAVEK: Logika, ki prepreči "puščanje" in takoj vrne odgovor
    if (wantsFresh) {
        if (canIngest) {
            try {
                const rss = await fetchRSSFeeds({ forceFresh: true })
                if (rss?.length) {
                    await syncToSupabase(rss.slice(0, 250))
                }
                return res.status(200).json({ success: true, message: 'Ingest completed' })
            } catch (err: any) { 
                console.error('❌ RSS sync error:', err)
                return res.status(500).json({ error: err.message })
            }
        } else {
            // Če uporabnik nima pravic, TAKOJ zaključimo in NE beremo novic iz baze!
            return res.status(200).json({ message: 'Ingest skipped (not authorized)' })
        }
    }

    // --- 3. PRIPRAVA POIZVEDBE (GET NEWS) ---
    // Če smo prišli do sem, pomeni, da gre za navaden ogled novic (ne forceFresh)
    const limitParam = parseInt(String(req.query.limit), 10)
    const defaultLimit = 24 
    const limit = Math.min(Math.max(limitParam || defaultLimit, 1), 300)
    const cursor = req.query.cursor ? Number(req.query.cursor) : null

    // Glavni query
    let q = supabaseRead
      .from('news')
      .select('id, link, link_key, title, source, image, contentsnippet, summary, published_at, publishedat, created_at, category, keywords')
      .gt('publishedat', 0)
      
      // --- 4. FILTRIRANJE OGLASOV ---
      .neq('category', 'oglas') 
      
    // SORTIRANJE:
    q = q
      .order('publishedat', { ascending: false })
      .order('id', { ascending: false })

    // Filtri
    if (sourceParam && sourceParam !== 'Vse') {
      const sources = sourceParam.split(',').map(s => s.trim()).filter(Boolean)
      if (sources.length > 0) {
        q = q.in('source', sources)
      }
    }

    // Datumsko filtriranje
    const dateFrom = req.query.from ? Number(req.query.from) : null
    const dateTo = req.query.to ? Number(req.query.to) : null

    if (dateFrom && dateTo) {
        q = q.gte('publishedat', dateFrom).lt('publishedat', dateTo)
    } 
    
    // Kursor (Paginacija)
    if (cursor && cursor > 0) {
        q = q.lt('publishedat', cursor)
    }

    if (category && category !== 'vse') {
      if (category === 'ostalo') {
         q = q.or('category.is.null,category.eq.ostalo')
      } else {
         q = q.eq('category', category)
      }
    }

    // --- 5. LOGIKA ISKANJA ---
    
    // Spremenljivka, ki pove, ali se izvaja iskanje (za cache)
    const isSearching = (tagQuery && tagQuery.trim().length > 0) || (searchQuery && searchQuery.trim().length > 0);

    // A) HITRO ISKANJE PO TAGU (Klik na trending tag)
    if (tagQuery && tagQuery.trim().length > 0) {
        const rawTag = tagQuery.trim().replace('#', ''); // Odstranimo lojtro za iskanje
        
        // Namesto strogega ujemanja korenov v 'keywords' (AND logika), 
        // razširimo iskanje še na naslov novice (title).
        // Uporabimo .or(), da povečamo možnost ujemanja.
        q = q.or(`keywords.cs.{${rawTag}},title.ilike.%${rawTag}%`);
    }
    
    // -------------------------------------------------------------------------------------
    // B) SPLOŠNO ISKANJE (Vpis v search bar) - STRICT TEXT ONLY & OPTIMIZED
    // -------------------------------------------------------------------------------------
    if (searchQuery && searchQuery.trim().length > 0) {
        // 1. Razbijemo iskanje na posamezne besede
        const terms = searchQuery.trim().split(/\s+/).filter(t => t.length > 1);

        if (terms.length > 0) {
            // 2. Za VSAKO vpisano besedo dodamo pogoj (AND logika)
            terms.forEach(term => {
                // Iščemo samo po 'title' in 'contentsnippet', ki sta hitra.
                const orConditions = [
                    `title.ilike.%${term}%`,
                    `contentsnippet.ilike.%${term}%`
                ];
                
                // Iščemo samo po vidnem tekstu (brez keywords).
                q = q.or(orConditions.join(','));
            });
        } else {
             // Fallback varnostna mreža
             q = q.ilike('title', `%${searchQuery.trim()}%`);
        }
    }

    // -----------------------------------------------------------------------
    // OPTIMIZACIJA: "Over-fetching"
    // -----------------------------------------------------------------------
    const bufferSize = 20;
    q = q.limit(limit + bufferSize)

    // --- 6. IZVEDBA POIZVEDBE ---
    const { data, error } = await q
    
    if (error) {
        console.error("❌ DB ERROR during fetch:", error);
        return res.status(500).json({ error: `DB: ${error.message}` })
    }

    const rows = (data || []) as Row[]
    const rawItems = rows.map(rowToItem)
    
    // Uporabimo softDedupe, ki poskrbi za čistejši seznam
    const dedupedItems = softDedupe(rawItems).sort((a, b) => b.publishedAt - a.publishedAt)
    
    // --- FINALNO REZANJE ---
    // Odrežemo točno toliko, kot je bilo zahtevano, da ne vračamo bufferja
    const items = dedupedItems.slice(0, limit);

    // Izračunamo kursor za naslednjo stran na podlagi ZADNJEGA vrnjenega elementa
    const nextCursor = items.length === limit ? items[items.length - 1].publishedAt : null

    // --- 7. CACHE CONTROL (FIX ZA LAGGING ISKANJE) ---
    // Če iščemo, NE smemo predpomniti (no-store), da dobimo vedno sveže rezultate.
    // Če samo listamo, uporabimo cache.
    if (isSearching) {
        res.setHeader('Cache-Control', 'no-store, max-age=0');
    } else {
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    }

    if (paged) return res.status(200).json({ items, nextCursor })
    return res.status(200).json(items)

  } catch (e: any) {
    console.error("❌ API CRASH:", e);
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
