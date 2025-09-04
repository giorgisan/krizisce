// pages/api/img.ts
import type { NextApiRequest, NextApiResponse } from 'next'

// dovoli velike slike
export const config = { api: { responseLimit: false } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const raw = (req.query.u as string) || ''
    if (!raw) return res.status(400).send('Missing u')

    const u = new URL(raw)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return res.status(400).send('Bad protocol')
    }

    const upstream = await fetch(u.toString(), {
      headers: {
        'User-Agent': 'krizisce-proxy/1.0',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
      cache: 'no-store',
    })

    if (!upstream.ok) {
      return res.status(upstream.status).send('Upstream error')
    }

    const buf = Buffer.from(await upstream.arrayBuffer())
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    // ključno: dovoli risanje v canvas
    res.setHeader('Access-Control-Allow-Origin', '*')

    res.status(200).send(buf)
  } catch {
    res.status(500).send('Proxy error')
  }
}
