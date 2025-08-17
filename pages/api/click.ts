// /pages/api/click.ts

import { supabase } from '@/lib/supabase'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { source, url } = req.body
  const userAgent = req.headers['user-agent'] || 'unknown'

  const { error } = await supabase.from('clicks').insert([
    {
      source,
      url,
      timestamp: new Date().toISOString(),
      user_agent: userAgent,
    },
  ])

  if (error) {
    console.error('Napaka pri vstavljanju v Supabase:', error)
    return res.status(500).json({ error: 'Napaka pri shranjevanju' })
  }

  return res.status(200).json({ message: 'Klik zabeležen' })
}
