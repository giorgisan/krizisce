// pages/api/news.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

// Row subset
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
  published_at: string | null
  publishedat: number | null
  created_at: string | null
}

// Client NewsItem (matches frontend)
type NewsItem = {
  title: string
  link: string
  source: string
  image?: string | null
  contentSnippet?: string | null
  publishedAt: number
  isoDate?: string | null
}

// Helpers
function rowPublishedMs(r: Row): number {
  if (r.publishedat && Number.isFinite(Number(r.publishedat))) return Number(r.publishedat)
  const cands = [r.published_at, r.isodate, r.pubdate, r.created_at].filter(Boolean) as string[]
  for (const iso of cands) {
    const ms = Date.parse(iso)
    if (!Number.isNaN(ms)) return ms
  }
  return 0
}

// Cursor encoding "<ms>_<id>"
function encodeCursor(ms: number, id: number) { return `${ms}_${id}` }
function decodeCursor(s: string | null): { ms: number, id: number } | null {
  if (!s) return null
  const m = String(s).match(/^(\d+)_(\d+)$/)
  if (!m) return null
  return { ms: Number(m[1]), id: Number(m[2]) }
}

type PagePayload = { items: NewsItem[], nextCursor: string | null }

export default async function handler(req: NextApiRequest, res: NextApiResponse<NewsItem[] | PagePayload | { error: string }>) {
  try {
    const paged = String(req.query.paged || '') === '1'
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '40'), 10) || 40, 1), 200)
    const source = (req.query.source as string) || null
    const cursorRaw = (req.query.cursor as string) || null
    const cursor = decodeCursor(cursorRaw)

    let q = supabase
      .from('news')
      .select('id, link, title, source, image, contentsnippet, summary, isodate, pubdate, published_at, publishedat, created_at')
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit)

    if (source) q = q.eq('source', source)

    if (cursor) {
      const iso = new Date(cursor.ms).toISOString()
      const or = `and(published_at.eq.${iso},id.lt.${cursor.id}),published_at.lt.${iso}`
      q = q.or(or)
    }

    const { data, error } = await q
    if (error) return res.status(500).json({ error: `DB error: ${error.message}` })

    const items: NewsItem[] = (data || []).map((r: Row) => ({
      title: r.title,
      link: r.link,
      source: r.source,
      image: r.image,
      contentSnippet: (r.summary && r.summary.trim()) ? r.summary : (r.contentsnippet && r.contentsnippet.trim()) ? r.contentsnippet : null,
      publishedAt: rowPublishedMs(r),
      isoDate: r.published_at || r.isodate || r.pubdate || r.created_at,
    }))

    // Not paged → return plain array (homepage first load)
    if (!paged) {
      res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30')
      return res.status(200).json(items)
    }

    let nextCursor: string | null = null
    if (data && data.length === limit) {
      const last = data[data.length - 1] as Row
      nextCursor = encodeCursor(rowPublishedMs(last), last.id)
    }

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30')
    return res.status(200).json({ items, nextCursor })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unexpected error' })
  }
}
