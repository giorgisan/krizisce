// pages/api/news.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import type { NewsItem as FeedNewsItem } from '@/types'

/* ==========================================================================
   1. KONFIGURACIJA
   ========================================================================== */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
const CRON_SECRET = process.env.CRON_SECRET as string | undefined

// Nastavitve za "Aktualno" (Trending)
const TREND_WINDOW_HOURS = 6;     // Zadnjih 6 ur
const TREND_MIN_SOURCES = 2;      // Vsaj 2 različna vira
const TREND_MAX_ITEMS = 50;
const SIMILARITY_THRESHOLD = 0.25; // Prag za trigrame

const supabaseRead = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})
const supabaseWrite = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null

/* ==========================================================================
   2. URL & HELPERJI (Iz originalne kode)
   ========================================================================== */
function cleanUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim())
    u.protocol = 'https:'
    u.host = u.host.toLowerCase().replace(/^www\./, '')
    const TRACK = [/^utm_/i, /^fbclid$/i, /^gclid$/i, /^ref$/i, /^src$/i, /^si_src$/i]
    for (const [k] of Array.from(u.searchParams.entries())) {
      if (TRACK.some((rx) => rx.test(k))) u.searchParams.delete(k)
    }
    u.pathname = u.pathname.replace(/\/amp\/?$/i, '/').replace(/\/+$/, '')
    u.hash = ''
    if (u.host.endsWith('rtvslo.si')) u.host = 'rtvslo.si'
    return u
  } catch { return null }
}

function makeLinkKey(raw: string, iso?: string | null): string {
  const u = cleanUrl(raw)
  if (!u) return raw.trim()
  
  const nums: string[] = []
  const pathNums = u.pathname.match(/\d{6,}/g)
  if (pathNums) nums.push(...pathNums)
  for (const [, v] of Array.from(u.searchParams.entries())) {
    if (/^\d{6,}$/.test(v)) nums.push(v)
  }
  
  if (nums.length > 0) {
      nums.sort((a, b) => b.length - a.length);
      return `https://${u.host}/a/${nums[0]}`
  }

  const parts = u.pathname.split('/').filter(Boolean)
  const last = (parts.length ? parts[parts.length - 1] : '').replace(/\.[a-z0-9]+$/i, '')
  let day = '';
  if (iso) {
      const d = new Date(iso);
      if (!Number.isNaN(+d)) day = d.toISOString().slice(0, 10).replace(/-/g, '');
  }
  if (last && day) return `https://${u.host}/a/${day}-${last.toLowerCase()}`
  return `https://${u.host}${u.pathname}`
}

/* ==========================================================================
   3. DB HELPERJI
   ========================================================================== */
type Row = {
  id: number; link: string; link_canonical: string | null; link_key: string | null;
  title: string; source: string; image: string | null; contentsnippet: string | null; summary: string | null;
  publishedat: number | null; published_at: string | null;
}

export type NewsItem = {
  title: string; link: string; source: string; image?: string | null;
  contentSnippet?: string | null; publishedAt: number;
}

function resolveTimestamps(item: FeedNewsItem) {
  const parse = (v?: string | null) => v ? Date.parse(v) : NaN
  let ms = parse(item.isoDate) || parse(item.pubDate) || (typeof item.publishedAt === 'number' ? item.publishedAt : Date.now())
  if (Number.isNaN(ms)) ms = Date.now()
  return { ms, iso: new Date(ms).toISOString() }
}

function feedItemToDbRow(item: FeedNewsItem) {
  const linkRaw = (item.link || '').trim()
  const ts = resolveTimestamps(item)
  const linkKey = makeLinkKey(linkRaw, ts.iso)
  if (!linkKey || !item.title) return null
  const snippet = (item.contentSnippet || item.content || '').replace(/<[^>]+>/g, ' ').slice(0, 500).trim()
  return {
    link: linkRaw,
    link_canonical: cleanUrl(linkRaw)?.toString() || linkRaw,
    link_key: linkKey,
    title: item.title.trim(),
    source: (item.source || '').trim(),
    image: item.image?.trim() || null,
    contentsnippet: snippet,
    summary: snippet,
    published_at: ts.iso,
    publishedat: ts.ms,
  }
}

function rowToItem(r: any): NewsItem {
  return {
    title: r.title,
    link: r.link_canonical || r.link,
    source: r.source,
    image: r.image,
    contentSnippet: r.summary || r.contentsnippet,
    publishedAt: Number(r.publishedat) || 0
  }
}

// ORIGINALNA FUNKCIJA ZA ZAPIS (Obvezno potrebna za await)
async function syncToSupabase(items: FeedNewsItem[]) {
  if (!supabaseWrite) return
  
  // Dedup na vhodu
  const byKey = new Map<string, FeedNewsItem>();
  items.forEach(i => {
      const link = (i.link || '').trim();
      if(link) byKey.set(link, i);
  });
  const uniqueItems = Array.from(byKey.values());

  const rows = uniqueItems.map(feedItemToDbRow).filter(Boolean) as any[]
  if (!rows.length) return

  const { error } = await (supabaseWrite as any)
    .from('news')
    .upsert(rows, { onConflict: 'link_key', ignoreDuplicates: true })

  if (error) throw error
}

/* ==========================================================================
   4. TRIGRAM LOGIKA (Ohranjena za boljše združevanje)
   ========================================================================== */
function getCharacterTrigrams(text: string): Map<string, number> {
  const clean = text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  const trigrams = new Map<string, number>();
  for (let i = 0; i < clean.length - 2; i++) {
    const gram = clean.slice(i, i + 3);
    trigrams.set(gram, (trigrams.get(gram) || 0) + 1);
  }
  return trigrams;
}

function cosineSimilarityTrigrams(v1: Map<string, number>, v2: Map<string, number>): number {
  let dot = 0, mag1 = 0, mag2 = 0;
  
  // Iteracija z Array.from za kompatibilnost
  const v1Vals = Array.from(v1.values());
  for(let i=0; i<v1Vals.length; i++) mag1 += v1Vals[i]**2;
  
  const v2Vals = Array.from(v2.values());
  for(let i=0; i<v2Vals.length; i++) mag2 += v2Vals[i]**2;
  
  if (!mag1 || !mag2) return 0;

  const [smaller, larger] = v1.size < v2.size ? [v1, v2] : [v2, v1];
  const smallEntries = Array.from(smaller.entries());
  
  for(let i=0; i<smallEntries.length; i++) {
      const [gram, count] = smallEntries[i];
      const count2 = larger.get(gram);
      if (count2) dot += count * count2;
  }
  return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

async function getTrendingItems() {
  const cutoff = Date.now() - TREND_WINDOW_HOURS * 3600000;
  const { data: rows, error } = await supabaseRead
    .from('news')
    .select('*')
    .gt('publishedat', cutoff)
    .order('publishedat', { ascending: false })
    .limit(300);

  if (error || !rows || !rows.length) return [];

  const docs = rows.map((r, i) => ({
    id: i,
    row: r,
    trigrams: getCharacterTrigrams(`${r.title} ${r.title} ${r.summary || ''}`),
    ms: Number(r.publishedat)
  })).filter(d => d.trigrams.size > 0);

  const clusters: typeof docs[] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      if (assigned.has(doc.id)) continue;
      const cluster = [doc];
      assigned.add(doc.id);

      for (let j = 0; j < docs.length; j++) {
          const other = docs[j];
          if (assigned.has(other.id)) continue;
          
          const sim = cosineSimilarityTrigrams(doc.trigrams, other.trigrams);
          if (sim > SIMILARITY_THRESHOLD) {
              cluster.push(other);
              assigned.add(other.id);
          }
      }
      clusters.push(cluster);
  }

  const results = [];
  for (const cluster of clusters) {
      const sources = new Set(cluster.map(c => c.row.source));
      if (sources.size < TREND_MIN_SOURCES) continue;
      
      cluster.sort((a, b) => b.ms - a.ms);
      const leader = cluster[0];
      
      const storyArticles = cluster.filter(c => c.id !== leader.id).map(c => ({
          source: c.row.source, link: c.row.link_canonical || c.row.link, title: c.row.title, publishedAt: c.ms
      }));
      
      results.push({
          ...rowToItem(leader.row),
          storyArticles,
          clusterSize: sources.size,
          freshness: leader.ms
      });
  }
  
  results.sort((a, b) => (b.clusterSize - a.clusterSize) || (b.freshness - a.freshness));
  return results.slice(0, TREND_MAX_ITEMS);
}

/* ==========================================================================
   5. API HANDLER (POPRAVLJEN INGEST!)
   ========================================================================== */
type PagedOk = { items: NewsItem[]; nextCursor: number | null }
type ListOk = NewsItem[]
type Err = { error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PagedOk | ListOk | Err>,
) {
  try {
    const paged = req.query.paged === '1'
    const wantsFresh = req.query.forceFresh === '1'
    const source = (req.query.source as string) || null
    const variant = (req.query.variant as string) || 'latest'

    // --- 1. TRENDING / AKTUALNO ---
    if (variant === 'trending') {
      try {
        const items = await getTrendingItems();
        res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=60');
        return res.status(200).json(items as any);
      } catch (err: any) {
        return res.status(500).json({ error: err?.message });
      }
    }

    // --- 2. INGEST LOGIKA (POPRAVLJENO!) ---
    // Tukaj je bil problem. Vrnjen je "await", da Vercel ne prekine procesa.
    
    const headerSecret = (req.headers['x-cron-secret'] as string | undefined)?.trim()
    const isCronCaller = Boolean(CRON_SECRET && headerSecret && headerSecret === CRON_SECRET)
    const isInternalIngest = req.headers['x-krizisce-ingest'] === '1'
    const isDev = process.env.NODE_ENV !== 'production'
    const tokenOk = CRON_SECRET && req.query.token === CRON_SECRET
    const allowPublic = process.env.ALLOW_PUBLIC_REFRESH === '1'
    
    const canIngest = isCronCaller || isInternalIngest || isDev || tokenOk || allowPublic

    if (!paged && wantsFresh && canIngest) {
      try {
        // AWAIT je nujen!
        const rss = await fetchRSSFeeds({ forceFresh: true })
        if (rss?.length) {
            await syncToSupabase(rss.slice(0, 250))
        }
      } catch (err) {
        console.error('❌ RSS sync error:', err)
        // Nadaljujemo, da vsaj vrnemo stare novice, če ingest spodleti
      }
    }

    // --- 3. SEZNAM (LATEST) ---
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? (paged ? 40 : 60)), 10) || (paged ? 40 : 60), 1), 200)
    const cursor = req.query.cursor ? Number(req.query.cursor) : null

    let q = supabaseRead
      .from('news')
      .select('*')
      .order('publishedat', { ascending: false })
      .order('id', { ascending: false })

    if (source && source !== 'Vse') q = q.eq('source', source)
    if (cursor && cursor > 0) q = q.lt('publishedat', cursor)
    q = q.limit(limit)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: `DB: ${error.message}` })

    const rows = (data || []) as Row[]
    const rawItems = rows.map(rowToItem)
    
    // Mehka de-duplikacija za seznam
    const dedupedItems = [];
    const seenKeys = new Set();
    const simpleNorm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    for(const item of rawItems) {
        // Ključ: Vir + Prvih 20 znakov naslova
        const key = item.source + '|' + simpleNorm(item.title).slice(0, 20);
        if(!seenKeys.has(key)) {
            dedupedItems.push(item);
            seenKeys.add(key);
        }
    }

    const nextCursor = rows.length === limit ? (rows[rows.length - 1].publishedat ? Number(rows[rows.length - 1].publishedat) : null) : null

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30')
    if (paged) return res.status(200).json({ items: dedupedItems, nextCursor })
    return res.status(200).json(dedupedItems)

  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
