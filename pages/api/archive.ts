// pages/api/archive.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })

// Helper za časovne pasove (Ljubljana)
function offsetHoursForDate(y: number, m: number, d: number, tz: string) {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, hour: '2-digit' })
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
  const parts = dtf.formatToParts(noonUtc)
  const hh = Number(parts.find(p => p.type === 'hour')?.value ?? '0')
  return hh - 12
}

function parseDateRangeTZ(dayISO?: string, tz = 'Europe/Ljubljana') {
  const base = dayISO ? new Date(dayISO + 'T00:00:00Z') : new Date()
  const y = base.getUTCFullYear()
  const m = base.getUTCMonth() + 1
  const d = base.getUTCDate()
  const offStart = offsetHoursForDate(y, m, d, tz)
  const offEnd   = offsetHoursForDate(y, m, d + 1, tz)
  const startMs = Date.UTC(y, m - 1, d, -offStart, 0, 0, 0)
  const endMs   = Date.UTC(y, m - 1, d + 1, -offEnd, 0, 0, 0)
  return { startISO: new Date(startMs).toISOString(), endISO: new Date(endMs).toISOString() }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const dateStr = (req.query.date as string) || undefined
    const { startISO, endISO } = parseDateRangeTZ(dateStr, 'Europe/Ljubljana')

    // Samo RPC klic za statistiko
    const { data: rpcData, error: rpcError } = await supabase.rpc('counts_by_source', {
      start_iso: startISO,
      end_iso: endISO,
    })

    if (rpcError) throw rpcError

    const counts: Record<string, number> = {}
    for (const row of (rpcData as any[]) || []) counts[row.source] = Number(row.count)
    const total = Object.values(counts).reduce((a, b) => a + b, 0)

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60')
    return res.status(200).json({ counts, total })
    
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
