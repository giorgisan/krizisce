// pages/api/click.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { source, url } = req.body

  const user_agent = req.headers['user-agent'] || null

  const { error } = await supabase.from('clicks').insert([
    { source, url, user_agent }
  ])

  if (error) {
    console.error('Error inserting click:', error)
    return res.status(500).json({ error: 'Failed to log click' })
  }

  return res.status(200).json({ success: true })
}
