import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API handler vklopljen, metoda:', req.method)

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  
  const { source, url } = req.body
  console.log('API klik prejet:', source, url)

  const user_agent = req.headers['user-agent'] || null
  const { error } = await supabase.from('clicks').insert([{ source, url, user_agent }])

  if (error) {
    console.error('Supabase error:', error)
    return res.status(500).json({ error: 'Failed to log click' })
  }

  return res.status(200).json({ success: true })
}
