// lib/sources.ts

export const SOURCES = [
  'Vse',
  'RTVSLO',
  '24ur',
  'Siol.net',
  'Slovenske novice',
  'Delo',
  'Dnevnik',
  'Zurnal24',
  'N1',
  'Svet24',
] as const

/**
 * Barve prilagojene za Dark Mode (svetlejši odtenki za boljšo čitljivost).
 * Usklajene z logotipi portalov.
 */
export const sourceColors: Record<string, string> = {
  // --- MODRI ODTENKI (Pazimo, da so različni) ---
  
  // Žurnal24: Svetlo modra (kot "24" v logotipu)
  'Zurnal24': '#7dd3fc',      // Sky 300 (Baby Blue)
  
  // 24ur: Klasična modra
  '24ur': '#60a5fa',          // Blue 400
  
  // Delo: Temnejša/Resnejša modra
  'Delo': '#38bdf8',          // Sky 400
  
  // Siol: Bolj "električno" modra
  'Siol.net': '#0ea5e9',      // Sky 500
  
  // RTV: Turkizna
  'RTVSLO': '#22d3ee',        // Cyan 400
  
  // N1: Vijolično-modra (Indigo)
  'N1': '#818cf8',            // Indigo 400

  // --- RDEČI ODTENKI ---
  'Slovenske novice': '#f87171', // Red 400 (Svetlo rdeča)
  'Dnevnik': '#fb7185',          // Rose 400 (Roza rdeča)
  'Svet24': '#ef4444',           // Red 500 (Živo rdeča)
  
  // Ostalo
  'Vse': '#9ca3af',              // Siva (Gray 400)
}

export const feeds: Record<string, string> = {
  '24ur': 'https://www.24ur.com/rss',
  RTVSLO: 'https://img.rtvslo.si/feeds/00.xml',
  'Siol.net': 'https://siol.net/feeds/latest',
  Zurnal24: 'https://www.zurnal24.si/feeds/latest',
  'Slovenske novice': 'https://www.slovenskenovice.si/rss',
  Delo: 'https://www.delo.si/rss',
  Dnevnik: 'https://www.dnevnik.si/rss.xml',
  N1: 'https://n1info.si/feed/',
  Svet24: 'https://svet24.si/rss/site.xml',
}

// (NEW) homepages – za scraping “hero” članka
export const homepages: Record<string, string> = {
  RTVSLO: 'https://www.rtvslo.si/',
  '24ur': 'https://www.24ur.com/',
  'Siol.net': 'https://siol.net/',
  Zurnal24: 'https://www.zurnal24.si/',
  'Slovenske novice': 'https://www.slovenskenovice.si/',
  Delo: 'https://www.delo.si/',
  Dnevnik: 'https://www.dnevnik.si/',
  N1: 'https://n1info.si/',
  Svet24: 'https://svet24.si/',
}
