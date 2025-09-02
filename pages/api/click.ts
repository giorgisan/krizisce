// pages/api/click.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import supabase from '@/lib/supabase'

type Body = {
  source?: string
  url?: string
  action?: string             // npr. 'open' | 'preview_open' | 'preview_close'
  meta?: Record<string, any>  // poljubni dodatki (duration_ms, dpr, ipd.)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Body
    const { source, url } = body
    const action = body.action || 'open'
    const meta = body.meta ?? {}

    if (!source || !url) {
      return res.status(400).json({ error: 'Missing source or url' })
    }

    const userAgent = req.headers['user-agent']?.toString() ?? 'unknown'

    const { error } = await supabase.from('clicks').insert(
      {
        source,
        url,
        action,
        meta,
        user_agent: userAgent,
        // created_at naj nastavi DB default NOW() (če imaš stolpec)
      },
      { returning: 'minimal' } // ne vračaj polnih vrstic, zmanjša obremenitev
    )

    if (error) {
      console.error('❌ Supabase insert error (click):', error)
      return res.status(500).json({ error: 'Insert failed' })
    }

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('❌ /api/click parse error:', e)
    return res.status(400).json({ error: 'Invalid JSON' })
  }
}
