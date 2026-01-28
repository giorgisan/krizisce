import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
// SPREMEMBA: Uvozimo tudi TREND_WINDOW_HOURS
import { computeTrending, TREND_WINDOW_HOURS } from '@/lib/trendingAlgo' 

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
    // 2. Zajem zadnjih novic (Uporabimo uvoženo konstanto!)
    // Namesto hardcoded 12 ur, uporabimo nastavitev iz algo datoteke
    const cutoff = Date.now() - (TREND_WINDOW_HOURS * 60 * 60 * 1000)
    
    const { data: rows, error } = await supabase
        .from('news')
        .select('*') 
        .gt('publishedat', cutoff)
        .neq('category', 'oglas')
        .order('publishedat', { ascending: false })
        .limit(800)

    if (error) throw error

    // 3. Izvedba Algoritma
    const trendingData = computeTrending(rows || [])

    // 4. Shranjevanje v Cache tabelo
    await supabase.from('trending_groups_cache').delete().neq('id', 0) 
    
    const { error: saveError } = await supabase
        .from('trending_groups_cache')
        .insert({ data: trendingData })

    if (saveError) throw saveError

    return res.status(200).json({ 
        success: true, 
        count: trendingData.length,
        windowHours: TREND_WINDOW_HOURS // Za debug informacijo
    })

  } catch (e: any) {
      console.error(e)
      return res.status(500).json({ error: e.message })
  }
}
