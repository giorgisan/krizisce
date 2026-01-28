// pages/api/cron/refresh-groups.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { computeTrending } from '@/lib/trendingAlgo' // <--- Uvozimo logiko

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Varnost
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 2. Zajem zadnjih novic (zadnjih 12 ur je dovolj za trende)
    const cutoff = Date.now() - (12 * 60 * 60 * 1000)
    
    const { data: rows, error } = await supabase
        .from('news')
        .select('*') // Rabimo vse za algoritem
        .gt('publishedat', cutoff)
        .neq('category', 'oglas')
        .order('publishedat', { ascending: false })
        .limit(800)

    if (error) throw error

    // 3. Izvedba Algoritma (CPU intenzivno, ampak teče v cronu)
    const trendingData = computeTrending(rows || [])

    // 4. Shranjevanje v Cache tabelo
    // Vedno posodobimo ID=1 (ali pa zadnji zapis), da ne polnimo baze
    // Najprej pobrišemo stare (ali pa samo updejtamo če imamo ID)
    await supabase.from('trending_groups_cache').delete().neq('id', 0) // Čiščenje (poenostavljeno)
    
    const { error: saveError } = await supabase
        .from('trending_groups_cache')
        .insert({ data: trendingData })

    if (saveError) throw saveError

    return res.status(200).json({ success: true, count: trendingData.length })

  } catch (e: any) {
      console.error(e)
      return res.status(500).json({ error: e.message })
  }
}
