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

export const sourceColors: Record<string,string> = {
  'RTVSLO': '#0052a5',
  '24ur': '#003399',
  'Siol.net': '#4f46e5',
  'Slovenske novice': '#bf2a24',
  'Delo': '#0d47a1',
  'Zurnal24': '#2574a9',
  'N1': '#283593',
  'Svet24': '#e53935',
  'Vse': '#9e9e9e',
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
