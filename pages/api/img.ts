// pages/api/img.ts
import type { NextApiRequest, NextApiResponse } from 'next'

// dovoli velike slike
export const config = { api: { responseLimit: false } }

/**
 * VARNOST: Seznam dovoljenih glavnih domen.
 * Koda bo avtomatsko dovolila tudi vse poddomene (npr. img.rtvslo.si).
 */
const ALLOWED_ROOTS = [
  'rtvslo.si',
  '24ur.com',
  'siol.net',
  'slovenskenovice.si',
  'delo.si',
  'dnevnik.si',
  'zurnal24.si',
  'svet24.si',
  'n1info.si',
  'metropolitan.si',
  'vecer.com',
  'primorske.si',
  // Dodaj ostale po potrebi
]

function isDomainAllowed(hostname: string): boolean {
  // Dovolimo localhost za testiranje
  if (hostname === 'localhost') return true
  
  // Preverimo, če se hostname konča z eno od dovoljenih korenskih domen
  // To pokrije: "rtvslo.si" in "img.rtvslo.si" in "www.rtvslo.si"
  return ALLOWED_ROOTS.some(root => 
    hostname === root || hostname.endsWith(`.${root}`)
  )
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const raw = (req.query.u as string) || ''
    if (!raw) return res.status(400).send('Missing u')

    let u: URL
    try {
      u = new URL(raw)
    } catch {
      return res.status(400).send('Invalid URL')
    }

    // --- VARNOSTNI PREGLED (SSRF Fix) ---
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return res.status(400).send('Bad protocol')
    }

    if (!isDomainAllowed(u.hostname)) {
      console.warn(`[ImgProxy] Blocked unauthorized domain: ${u.hostname}`)
      return res.status(403).send('Unauthorized domain')
    }
    // -------------------------------------

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
  } catch (e) {
    console.error(e)
    res.status(500).send('Proxy error')
  }
}
