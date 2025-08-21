import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url parameter' })
    return
  }
  try {
    const response = await fetch(url)
    if (!response.ok) {
      res.status(500).json({ error: 'Failed to fetch url' })
      return
    }
    const html = await response.text()
    res.status(200).json({ html })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch preview' })
  }
}
