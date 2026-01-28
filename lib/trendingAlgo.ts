import { NewsItem } from '@/types'

// Konstante za algoritem - DODAN 'export'
export const TREND_WINDOW_HOURS = 8 // Gledamo novice zadnjih 8 ur
const TREND_MIN_SOURCES = 3        
const TREND_MIN_OVERLAP = 2
const TREND_MAX_ITEMS = 10 
const TREND_HOT_CUTOFF_HOURS = 4
const TREND_JACCARD_THRESHOLD = 0.20

// Stop besede (skrajšan seznam za demo)
const STORY_STOPWORDS = new Set(['v', 'na', 'ob', 'po', 'pri', 'pod', 'nad', 'za', 'do', 'od', 'z', 's', 'in', 'ali', 'pa', 'kot', 'je', 'so', 'se', 'bo', 'bodo', 'bil', 'bila', 'bili', 'bilo', 'bi', 'ko', 'ker', 'da', 'ne', 'ni', 'sta', 'ste', 'smo', 'danes', 'vceraj', 'nocoj', 'slovenija', 'ljubljana', 'foto', 'video']);

function unaccent(s: string) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') }
function stemToken(raw: string) {
  if (raw.length <= 4) return raw
  if (raw.length > 6) return raw.substring(0, raw.length - 2)
  return raw.substring(0, raw.length - 1)
}

function extractKeywords(text: string): string[] {
  const base = unaccent(text || '').toLowerCase()
  const clean = base.replace(/[^a-z0-9\s]/g, ' ') 
  const tokens = clean.split(/\s+/).filter(Boolean)
  const out: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    let w = tokens[i]
    if (!w || w.length < 3 || STORY_STOPWORDS.has(w)) continue 
    const stem = stemToken(w)
    if (out.indexOf(stem) === -1) out.push(stem)
  }
  return out
}

export type TrendingGroupResult = (NewsItem & { storyArticles: any[] })

export function computeTrending(rows: any[]): TrendingGroupResult[] {
  if (!rows || rows.length === 0) return []

  const metas = rows.map((row) => {
      const ms = row.publishedat || (row.published_at ? Date.parse(row.published_at) : Date.now())
      const text = `${row.title} ${row.title} ${row.summary || row.contentsnippet || ''}`
      return { row, ms, keywords: extractKeywords(text) }
  }).filter(m => m.keywords.length > 0)

  metas.sort((a, b) => b.ms - a.ms)

  const groups: any[] = []
  
  // 1. GRUPIRANJE (Jaccard)
  for (let i = 0; i < metas.length; i++) {
    const m = metas[i]
    let attachedIndex = -1
    let bestScore = 0
    
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]
      let intersect = 0
      const unionSet = new Set([...g.keywords, ...m.keywords])
      
      for (const kw of m.keywords) {
         if (g.keywords.includes(kw)) intersect++
      }
      
      const jaccard = unionSet.size > 0 ? (intersect / unionSet.size) : 0
      
      if (intersect >= TREND_MIN_OVERLAP && jaccard >= TREND_JACCARD_THRESHOLD) {
        if (jaccard > bestScore) {
          bestScore = jaccard
          attachedIndex = gi
        }
      }
    }

    if (attachedIndex >= 0) {
      const g = groups[attachedIndex]
      g.rows.push(m)
      for (const kw of m.keywords) {
          if (!g.keywords.includes(kw)) g.keywords.push(kw)
      }
    } else {
      groups.push({ rows: [m], keywords: [...m.keywords] })
    }
  }

  // 2. TOČKOVANJE IN FILTRIRANJE
  const nowMs = Date.now()
  const scored = []

  for (const g of groups) {
     const uniqueSources = new Set(g.rows.map((r: any) => r.row.source)).size
     if (uniqueSources < TREND_MIN_SOURCES) continue

     let rep = g.rows[0]
     let newestMs = 0
     
     for (const r of g.rows) {
         if (r.ms > newestMs) newestMs = r.ms
         if (r.row.image && !rep.row.image) rep = r
     }
     
     if ((nowMs - newestMs) > (TREND_HOT_CUTOFF_HOURS * 3600000)) continue

     scored.push({ group: g, rep, uniqueSources, newestMs })
  }

  // 3. SORTIRANJE (Največ virov + svežina)
  scored.sort((a, b) => {
      if (b.uniqueSources !== a.uniqueSources) return b.uniqueSources - a.uniqueSources
      return b.newestMs - a.newestMs
  })

  // 4. FORMATIRANJE REZULTATA
  return scored.slice(0, TREND_MAX_ITEMS).map(sg => {
      const repRow = sg.rep.row
      
      const storyArticles = sg.group.rows
        .filter((r: any) => r.row.id !== repRow.id)
        .map((r: any) => ({
            source: r.row.source,
            title: r.row.title,
            link: r.row.link,
            publishedAt: r.ms
        }))

      return {
          id: repRow.id,
          title: repRow.title,
          link: repRow.link,
          source: repRow.source,
          image: repRow.image,
          contentSnippet: repRow.summary || repRow.contentsnippet,
          publishedAt: sg.newestMs,
          category: repRow.category || 'ostalo',
          storyArticles: storyArticles
      }
  })
}
