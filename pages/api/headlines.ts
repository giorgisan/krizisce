// pages/api/headlines.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getFeaturedOnePerSource } from '@/lib/featured'

// Helper: absoluten URL do istega Vercel deploymenta
function absoluteUrl(req: NextApiRequest, path: string) {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || ''
  return `${proto}://${host}${path}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Poskrbi, da lib/featured lahko pokliče /api/news kot absolutni URL
    process.env.NEXT_PUBLIC_BASE_URL = absoluteUrl(req, '')

    const items = await getFeaturedOnePerSource()
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600')
    res.status(200).json(items)
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: 'headlines_failed' })
  }
}
