// lib/sources.ts

export const SOURCES = [
  'Vse',
  'RTVSLO',
  '24ur',
  'Siol.net',
  'Slovenske novice',
  'Delo',
  'Zurnal24',
  'N1',
  'Svet24',
]

export const sourceColors: Record<string, string> = {
  'RTVSLO': '#3263ad',
  '24ur': '#B71C1C',
  'Siol.net': '#1E88E5',
  'Slovenske novice': '#C2185B',
  'Delo': '#0D47A1',
  'Zurnal24': '#F9A825',
  'N1': '#283593',
  'Svet24': '#F57C00',
  'Vse': '#9E9E9E',
}

export const feeds: Record<string, string> = {
  '24ur': 'https://www.24ur.com/rss',
  'RTVSLO': 'https://img.rtvslo.si/feeds/00.xml',
  'Siol.net': 'https://siol.net/feeds/latest',
  'Zurnal24': 'https://www.zurnal24.si/feeds/latest',
  'Slovenske novice': 'https://www.slovenskenovice.si/rss',
  'Delo': 'https://www.delo.si/rss',
  'N1': 'https://n1info.si/feed/',
  'Svet24': 'https://svet24.si/rss/site.xml',
}
