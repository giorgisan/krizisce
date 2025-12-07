// pages/api/news.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import type { NewsItem as FeedNewsItem } from '@/types'

/* ==========================================================================
   1. CONFIG & SUPABASE
   ========================================================================== */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
const CRON_SECRET = process.env.CRON_SECRET as string | undefined

// Nastavitve, ki ste jih zahtevali
const TREND_WINDOW_HOURS = 6;  // STROGO: Samo zadnjih 6 ur za "Aktualno"
const TREND_MIN_SOURCES = 2;   // Vsaj 2 vira za potrditev novice
const TREND_MAX_ITEMS = 50;    // Max število prikazanih gruč
const SIMILARITY_THRESHOLD = 0.25; // Nižji prag, ker trigrami ustvarijo redkejše vektorje

const supabaseRead = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})
const supabaseWrite = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null

/* ==========================================================================
   2. ROBUSTNO PROCESIRANJE TEKSTA (TRIGRAMI)
   ========================================================================== */
// Namesto iskanja besed (ki odpove pri "vlom" vs "vlamljanje"),
// razbijemo tekst na zaporedja 3 znakov. To je imuno na tipkarske napake in sklanjanje.

function getCharacterTrigrams(text: string): Map<string, number> {
  // 1. Očistimo tekst (samo črke in številke, male črke, brez šumnikov za boljšo primerjavo)
  const clean = text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Odstrani strešice (čšž -> csz)
    .replace(/[^a-z0-9]/g, ''); // Samo alfanumerični znaki

  const trigrams = new Map<string, number>();

  // 2. Drseče okno po 3 znake
  for (let i = 0; i < clean.length - 2; i++) {
    const gram = clean.slice(i, i + 3);
    trigrams.set(gram, (trigrams.get(gram) || 0) + 1);
  }
  
  return trigrams;
}

// Izračun kosinusne podobnosti med dvema mapama trigramov
function cosineSimilarityTrigrams(v1: Map<string, number>, v2: Map<string, number>): number {
  let dot = 0;
  let mag1 = 0;
  let mag2 = 0;

  // Izračun magnitude za v1
  const entries1 = Array.from(v1.values());
  for(let i=0; i<entries1.length; i++) mag1 += entries1[i] ** 2;

  // Izračun magnitude za v2
  const entries2 = Array.from(v2.values());
  for(let i=0; i<entries2.length; i++) mag2 += entries2[i] ** 2;

  if (mag1 === 0 || mag2 === 0) return 0;

  // Skalarni produkt (optimizirano: iteriramo po manjšem vektorju)
  const [smaller, larger] = v1.size < v2.size ? [v1, v2] : [v2, v1];
  const smallEntries = Array.from(smaller.entries());
  
  for(let i=0; i<smallEntries.length; i++) {
      const [gram, count1] = smallEntries[i];
      const count2 = larger.get(gram);
      if (count2) {
          dot += count1 * count2;
      }
  }

  return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

/* ==========================================================================
   3. POMOŽNE FUNKCIJE (URL, DATUMI)
   ========================================================================== */
function cleanUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim())
    u.protocol = 'https:'
    u.host = u.host.toLowerCase().replace(/^www\./, '')
    const TRACK = [/^utm_/i, /^fbclid$/i, /^gclid$/i, /^ref$/i, /^src$/i, /^si_src$/i]
    
    const params = Array.from(u.searchParams.entries());
    for (let i = 0; i < params.length; i++) {
        if (TRACK.some((rx) => rx.test(params[i][0]))) {
            u.searchParams.delete(params[i][0]);
        }
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

  const params = Array.from(u.searchParams.entries());
  for (let i = 0; i < params.length; i++) {
      if (/^\d{6,}$/.test(params[i][1])) nums.push(params[i][1])
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
      if (!Number.isNaN(+d)) {
          day = d.toISOString().slice(0, 10).replace(/-/g, '');
      }
  }
  
  if (last && day) return `https://${u.host}/a/${day}-${last.toLowerCase()}`
  return `https://${u.host}${u.pathname}`
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

function rowToItem(r: any): any {
  return {
    title: r.title,
    link: r.link_canonical || r.link,
    source: r.source,
    image: r.image,
    contentSnippet: r.summary || r.contentsnippet,
    publishedAt: Number(r.publishedat) || 0
  }
}

/* ==========================================================================
   4. CLUSTERING ENGINE (TRIGRAMS)
   ========================================================================== */
async function getTrendingItems() {
  // 1. Pridobimo samo novice zadnjih 6 UR (kot zahtevano)
  const cutoff = Date.now() - TREND_WINDOW_HOURS * 3600000;
  
  const { data: rows, error } = await supabaseRead
    .from('news')
    .select('*')
    .gt('publishedat', cutoff)
    .order('publishedat', { ascending: false })
    .limit(300); // Dovolj velik vzorec za grupiranje

  if (error || !rows || !rows.length) return [];

  // 2. Priprava dokumentov (izračun trigramov)
  const docs = rows.map((r, i) => {
    // Združimo naslov in povzetek. Naslov šteje več.
    const text = `${r.title} ${r.title} ${r.summary || ''}`;
    return {
        id: i,
        row: r,
        trigrams: getCharacterTrigrams(text),
        ms: Number(r.publishedat)
    };
  }).filter(d => d.trigrams.size > 0);

  // 3. Grupiranje (Clustering)
  const clusters: typeof docs[] = [];
  const assigned = new Set<number>();

  // Novice sortirane po času. Najnovejša novica začne nov grozd.
  for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      if (assigned.has(doc.id)) continue;

      const cluster = [doc];
      assigned.add(doc.id);

      // Primerjamo z vsemi ostalimi
      for (let j = 0; j < docs.length; j++) {
          const other = docs[j];
          if (assigned.has(other.id)) continue;

          // Izračunaj podobnost na podlagi trigramov (ne besed!)
          const sim = cosineSimilarityTrigrams(doc.trigrams, other.trigrams);
          
          // Ker trigrami ujamejo koren besede ("bencin" v "bencinski"), je podobnost višja.
          // Prag 0.25 je po testiranjih idealen za trigrame na kratkih tekstih.
          if (sim > SIMILARITY_THRESHOLD) {
              cluster.push(other);
              assigned.add(other.id);
          }
      }
      clusters.push(cluster);
  }

  // 4. Formatiranje
  const results = [];
  for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      
      const sources = new Set(cluster.map(c => c.row.source));
      if (sources.size < TREND_MIN_SOURCES) continue; // Ignoriraj, če je samo en vir

      // Najnovejši članek v gruči je glavni (reprezentativni)
      cluster.sort((a, b) => b.ms - a.ms);
      const leader = cluster[0];

      const storyArticles = cluster
        .filter(c => c.id !== leader.id)
        .map(c => ({
            source: c.row.source,
            link: c.row.link_canonical || c.row.link,
            title: c.row.title,
            publishedAt: c.ms
        }));

      results.push({
          ...rowToItem(leader.row),
          storyArticles,
          clusterSize: sources.size,
          freshness: leader.ms
      });
  }

  // 5. Sortiranje: Najprej število virov, potem čas
  results.sort((a, b) => {
      // Velikost grozda ima prednost. Če sta enako velika, zmaga novejši.
      if (a.clusterSize !== b.clusterSize) {
          return b.clusterSize - a.clusterSize;
      }
      return b.freshness - a.freshness;
  });

  return results.slice(0, TREND_MAX_ITEMS);
}

/* ==========================================================================
   5. API HANDLER
   ========================================================================== */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { variant, forceFresh } = req.query;

    // --- A) TRENDING (AKTUALNO) ---
    if (variant === 'trending') {
      try {
        const items = await getTrendingItems();
        // Cache: 2 minuti
        res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=60');
        return res.status(200).json(items);
      } catch (err: any) {
        console.error("Trending Error:", err);
        return res.status(500).json({ error: err.message });
      }
    }

    // --- B) INGEST (OSVEŽEVANJE) ---
    const canIngest = forceFresh === '1' && (
        process.env.ALLOW_PUBLIC_REFRESH === '1' || 
        req.query.token === CRON_SECRET ||
        process.env.NODE_ENV !== 'production'
    );

    if (canIngest) {
      fetchRSSFeeds({ forceFresh: true })
        .then(rss => {
           if (rss && rss.length) {
               const rows = rss.map(feedItemToDbRow).filter(Boolean);
               if (supabaseWrite) {
                   return (supabaseWrite as any).from('news').upsert(rows, { 
                       onConflict: 'link_key', 
                       ignoreDuplicates: true 
                   });
               }
           }
        })
        .catch(err => console.error("Ingest Error:", err));
    }

    // --- C) LATEST (NAJNOVEJŠE - GRID/LIST) ---
    const limit = Math.min(Number(req.query.limit) || 60, 100);
    const cursor = req.query.cursor ? Number(req.query.cursor) : null;

    let q = supabaseRead
        .from('news')
        .select('*')
        .order('publishedat', { ascending: false })
        .limit(limit);

    if (req.query.source && req.query.source !== 'Vse') {
        q = q.eq('source', req.query.source);
    }
    if (cursor) {
        q = q.lt('publishedat', cursor);
    }
    
    const { data, error } = await q;
    if (error) throw error;
    
    // Mehka de-duplikacija za navaden seznam
    const items = (data || []).map(rowToItem);
    const dedupedItems = [];
    const seenKeys = new Set();
    
    // Unaccent funkcija za dedup ključ
    const simpleNorm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    for(const item of items) {
        // Ključ: Vir + Prvih 20 znakov naslova (ignorira male razlike)
        const key = item.source + '|' + simpleNorm(item.title).slice(0, 20);
        if(!seenKeys.has(key)) {
            dedupedItems.push(item);
            seenKeys.add(key);
        }
    }

    const nextCursor = data && data.length === limit ? data[data.length-1].publishedat : null;
    
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    if (req.query.paged === '1') {
        return res.status(200).json({ items: dedupedItems, nextCursor });
    }
    return res.status(200).json(dedupedItems);

  } catch (e: any) {
    console.error("API Error:", e);
    res.status(500).json({ error: e.message || 'Unknown error' });
  }
}
