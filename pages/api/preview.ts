import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url parameter' })
    return
  }
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    if (!response.ok) {
      res.status(500).json({ error: 'Failed to fetch preview' })
      return
    }
    const html = await response.text()
    res.status(200).json({ html })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch preview' })
  }
}
