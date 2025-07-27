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
  '24ur': '#404faf',
  'Siol.net': '#413f93',
  'Slovenske novice': '#F5593B',
  'Delo': '#0052a1',
  'Zurnal24': '#678ca3',
  'N1': '#253d9c',
  'Svet24': '#ee9999',
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
