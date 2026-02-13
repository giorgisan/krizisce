/* pages/api/cron/refresh-groups.ts */
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
// IMPORTIRAJ NOVO ASYNC FUNKCIJO
import { computeTrending, TREND_WINDOW_HOURS } from '@/lib/trendingAlgo' 

// Povečaj timeout, ker AI rabi čas (vsaj 60s)
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const cutoff = Date.now() - (TREND_WINDOW_HOURS * 60 * 60 * 1000)
    
    // Zajem: Morda zmanjšaj limit iz 800 na 300, če želiš hitrejši odziv in manj tokenov
    // Za Gemini 3 Flash je 800 OK, ampak 300 je običajno dovolj za "trende".
    const { data: rows, error } = await supabase
        .from('news')
        .select('*') 
        .gt('publishedat', cutoff)
        .neq('category', 'oglas')
        .order('publishedat', { ascending: false })
        .limit(500) // Kompromis med 300 in 800

    if (error) throw error

    // !!! TUKAJ JE GLAVNA SPREMEMBA: AWAIT !!!
    const trendingData = await computeTrending(rows || [])

    // Shranjevanje v Cache (kot prej)
    await supabase.from('trending_groups_cache').delete().neq('id', 0) 
    
    if (trendingData.length > 0) {
        const { error: saveError } = await supabase
            .from('trending_groups_cache')
            .insert({ data: trendingData })
        if (saveError) throw saveError
    }

    return res.status(200).json({ 
        success: true, 
        count: trendingData.length,
        method: 'AI-Clustering (Gemini 3 Flash)' // Za debug
    })

  } catch (e: any) {
      console.error(e)
      return res.status(500).json({ error: e.message })
  }
}
