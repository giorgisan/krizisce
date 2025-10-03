// pages/api/news.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import type { NewsItem as FeedNewsItem } from '@/types'

/**
 * Stable "freshest-first" news API.
 * - Sorts by `published_at DESC` on the DB (single source of truth).
 * - Falls back to `publishedat` (ms), then `isodate/pubdate`, finally `created_at`.
 * - Supports paging with cursor = ISO timestamp string (published_at of last item).
 * - Optional filtering by source.
 */

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
  title: string
  source: string
  image: string | null
  contentsnippet: string | null
  summary: string | null
  isodate: string | null
  pubdate: string | null
  published_at: string | null          // timestamptz
  publishedat: number | null           // bigint ms
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

type ApiNewsItem = NewsItem

type DbInsert = {
  link: string
  title: string
  source: string
  image: string | null
  contentsnippet: string | null
  summary: string | null
  isodate: string | null
  pubdate: string | null
  published_at: string
  publishedat: number
}

type PagedOk = { items: NewsItem[]; nextCursor: string | null }
type ListOk = NewsItem[]
type Err = { error: string }

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

function feedItemToApi(item: FeedNewsItem): ApiNewsItem | null {
  const link = (item.link || '').trim()
  const title = (item.title || '').trim()
  const source = (item.source || '').trim()
  if (!link || !title || !source) return null

  const ts = resolveTimestamps(item)
  const snippet = normalizeSnippet(item)

  return {
    title,
    link,
    source,
    image: item.image?.trim() || null,
    contentSnippet: snippet,
    publishedAt: ts.ms,
    isoDate: ts.isoRaw,
  }
}

function feedItemToDbRow(item: FeedNewsItem): DbInsert | null {
  const link = (item.link || '').trim()
  const title = (item.title || '').trim()
  const source = (item.source || '').trim()
  if (!link || !title || !source) return null

  const ts = resolveTimestamps(item)
  const snippet = normalizeSnippet(item)

  return {
    link,
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
  const rows = items.map(feedItemToDbRow).filter((row): row is DbInsert => Boolean(row))
  if (!rows.length) return
  const { error } = await supabaseWrite
    .from('news')
    .upsert(rows, { onConflict: 'link', ignoreDuplicates: false })
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
    link: r.link,
    source: r.source,
    image: r.image || null,
    contentSnippet: r.summary?.trim() || r.contentsnippet?.trim() || null,
    publishedAt: ms,
    isoDate: r.published_at || r.isodate || r.pubdate || null,
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<PagedOk | ListOk | Err>) {
  try {
    const paged = req.query.paged === '1'
    const wantsFresh = req.query.forceFresh === '1'
    const source = (req.query.source as string) || null

    if (!paged && (wantsFresh || !source || source === 'Vse')) {
      try {
        const feedItems = await fetchRSSFeeds({ forceFresh: wantsFresh })
        const deduped = dedupeByLink(feedItems)
        const trimmed = deduped.slice(0, 200)

        if (trimmed.length) {
          await syncToSupabase(trimmed).catch((err) =>
            console.error('❌ Supabase sync error (news):', err),
          )

          if (wantsFresh) {
            const payload = trimmed
              .map(feedItemToApi)
              .filter((item): item is ApiNewsItem => Boolean(item))

            if (payload.length) {
              res.setHeader('Cache-Control', 'no-store')
              return res.status(200).json(payload)
            }
          }
        }
      } catch (err) {
        console.error('❌ Fetch RSS error:', err)
      }
    }

    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit ?? (paged ? 40 : 60)), 10) || (paged ? 40 : 60), 1),
      200,
    )
    const cursor = (req.query.cursor as string) || null        // ISO string (published_at of last item)

    // Base select
    let q = supabaseRead
      .from('news')
      .select('id, link, title, source, image, contentsnippet, summary, isodate, pubdate, published_at, publishedat, created_at')
      .order('published_at', { ascending: false })  // relies on trigger keeping it non-null
      .order('id', { ascending: false })            // tie-breaker for same second

    if (source && source !== 'Vse') q = q.eq('source', source)

    if (cursor) {
      // fetch strictly older than last published_at on the client
      q = q.lt('published_at', cursor)
    }

    q = q.limit(limit)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: `DB: ${error.message}` })

    const rows = (data || []) as Row[]
    const items = rows.map(rowToItem)

    const nextCursor = rows.length === limit ? (rows[rows.length - 1].published_at || null) : null

    if (paged) {
      const payload: PagedOk = { items, nextCursor }
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json(payload)
    } else {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json(items)
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
