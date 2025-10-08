// pages/api/news.ts — FULL REPLACEMENT
// - Nikoli ne vrača surovega RSS. forceFresh samo sproži sync v bazo.
// - Kanonikalizira URL-je in upserta po link_canonical, da ni dvojnikov.

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import type { NewsItem as FeedNewsItem } from '@/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined

const supabaseRead = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

const supabaseWrite = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null

type Row = {
  id: number
  link: string
  link_canonical: string | null
  title: string
  source: string
  image: string | null
  contentsnippet: string | null
  summary: string | null
  isodate: string | null
  pubdate: string | null
  published_at: string | null
  publishedat: number | null
  created_at: string | null
}

export type NewsItem = {
  title: string
  link: string
  source: string
  image?: string | null
  contentSnippet?: string | null
  publishedAt: number
  isoDate?: string | null
}

type PagedOk = { items: NewsItem[]; nextCursor: number | null }
type ListOk = NewsItem[]
type Err = { error: string }

/* ========= kanonikalizacija URL-jev ========= */
function canonicalize(raw: string): string {
  try {
    const u = new URL(raw.trim())
    // https
    u.protocol = 'https:'
    // host: lowercase, brez www.
    u.host = u.host.toLowerCase().replace(/^www\./, '')
    // odstrani tracking queryje
    const TRACK = [
      /^utm_/i, /^fbclid$/i, /^gclid$/i, /^ref$/i, /^src$/i, /^from$/i,
      /^si_src$/i, /^mc_cid$/i, /^mc_eid$/i
    ]
    for (const k of Array.from(u.searchParams.keys())) {
      if (TRACK.some(rx => rx.test(k))) u.searchParams.delete(k)
    }
    // odstrani /amp in trailing slash (razen /)
    u.pathname = u.pathname.replace(/\/amp\/?$/i, '/')
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/,'')
    // brez hash-a
    u.hash = ''
    // posebnosti
    if (u.host.endsWith('rtvslo.si')) u.host = 'rtvslo.si'
    return u.toString()
  } catch {
    return raw.trim()
  }
}

/* ========= helperji ========= */
function dedupeByLink(items: FeedNewsItem[]): FeedNewsItem[] {
  const seen = new Set<string>()
  const out: FeedNewsItem[] = []
  for (const item of items) {
    const link = (item.link || '').trim()
    if (!link || seen.has(link)) continue
    seen.add(link)
    out.push(item)
  }
  return out
}

function normalizeSnippet(item: FeedNewsItem): string | null {
  const snippet = (item.contentSnippet || '').trim()
  if (snippet) return snippet
  const fromContent = (item.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
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
  const fromPub = parse(item.pubDate)
  const msFromNumber =
    typeof item.publishedAt === 'number' && Number.isFinite(item.publishedAt) && item.publishedAt > 0
      ? item.publishedAt
      : null
  const ms = fromIso?.ms ?? fromPub?.ms ?? msFromNumber ?? Date.now()
  const iso = fromIso?.iso ?? fromPub?.iso ?? new Date(ms).toISOString()
  const isoRaw = fromIso?.raw ?? (fromPub ? fromPub.iso : null)
  const pubRaw = fromPub?.raw ?? null
  return { ms: Math.round(ms), iso, isoRaw: isoRaw ?? iso, pubRaw }
}

function feedItemToDbRow(item: FeedNewsItem) {
  const linkRaw = (item.link || '').trim()
  const linkCanonical = canonicalize(linkRaw)
  const title = (item.title || '').trim()
  const source = (item.source || '').trim()
  if (!linkCanonical || !title || !source) return null
  const ts = resolveTimestamps(item)
  const snippet = normalizeSnippet(item)
  return {
    link: linkRaw,
    link_canonical: linkCanonical,
    title,
    source,
    image: item.image?.trim() || null,
    contentsnippet: snippet,
    summary: snippet,
    isodate: ts.isoRaw,
    pubdate: ts.pubRaw,
    published_at: ts.iso,
    publishedat: ts.ms,
  }
}

async function syncToSupabase(items: FeedNewsItem[]) {
  if (!supabaseWrite) return
  const rows = items.map(feedItemToDbRow).filter(Boolean) as any[]
  if (!rows.length) return
  const { error } = await supabaseWrite
    .from('news')
    .upsert(rows, { onConflict: 'link_canonical', ignoreDuplicates: false })
  if (error) throw error
}

function toMs(s?: string | null): number {
  if (!s) return 0
  const v = Date.parse(s)
  return Number.isFinite(v) ? v : 0
}

function rowToItem(r: Row): NewsItem {
  const ms =
    (r.publishedat && Number(r.publishedat)) ||
    toMs(r.published_at) ||
    toMs(r.pubdate) ||
    toMs(r.isodate) ||
    toMs(r.created_at) ||
    Date.now()

  return {
    title: r.title,
    link: r.link || r.link_canonical || '',
    source: r.source,
    image: r.image || null,
    contentSnippet: r.summary?.trim() || r.contentsnippet?.trim() || null,
    publishedAt: ms,
    isoDate: r.published_at || r.isodate || r.pubdate || null,
  }
}

/* ========= handler ========= */
export default async function handler(req: NextApiRequest, res: NextApiResponse<PagedOk | ListOk | Err>) {
  try {
    const paged = req.query.paged === '1'
    const wantsFresh = req.query.forceFresh === '1'
    const source = (req.query.source as string) || null

    // forceFresh: naredimo sync RSS -> DB (v ozadju), nikoli ne vračamo surovega RSS
    if (!paged && wantsFresh) {
      try {
        const rss = await fetchRSSFeeds({ forceFresh: true })
        const deduped = dedupeByLink(rss).slice(0, 200)
        if (deduped.length) await syncToSupabase(deduped)
      } catch (err) {
        console.error('❌ RSS sync error:', err)
      }
    }

    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit ?? (paged ? 40 : 60)), 10) || (paged ? 40 : 60), 1),
      200,
    )

    const cursor = req.query.cursor ? Number(req.query.cursor) : null

    let q = supabaseRead
      .from('news')
      .select('id, link, link_canonical, title, source, image, contentsnippet, summary, isodate, pubdate, published_at, publishedat, created_at')
      .order('publishedat', { ascending: false })
      .order('id', { ascending: false })

    if (source && source !== 'Vse') q = q.eq('source', source)
    if (cursor && cursor > 0) q = q.lt('publishedat', cursor)
    q = q.limit(limit)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: `DB: ${error.message}` })

    const rows = (data || []) as Row[]
    const items = rows.map(rowToItem)

    const nextCursor =
      rows.length === limit
        ? (rows[rows.length - 1].publishedat ? Number(rows[rows.length - 1].publishedat) : null)
        : null

    res.setHeader('Cache-Control', 'no-store')
    if (paged) return res.status(200).json({ items, nextCursor })
    return res.status(200).json(items)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
