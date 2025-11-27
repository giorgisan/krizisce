// lib/sourceMeta.ts
//
// Centralni metadata za slovenske vire.
// - ime mora ustrezati vrednosti `news.source` iz Supabase/API
// - `slug` mora imeti logo v /public/logos/<slug>.png
//
// Primer:  source = "RTVSLO"  ->  /logos/rtvslo.png

export type SourceMeta = {
  /** Ime, ki ga vidiš v `news.source` (npr. "RTVSLO") */
  name: string
  /** Kratki slug, ki ustreza datoteki v /public/logos/<slug>.png */
  slug: string
  /** Opcijski krajši label (npr. "Žurnal24" vs. "Žurnal24") */
  label?: string
}

const RAW_SOURCES: SourceMeta[] = [
  { name: 'RTVSLO', slug: 'rtvslo', label: 'RTVSLO' },
  { name: '24ur', slug: '24ur', label: '24ur' },
  { name: 'Siol.net', slug: 'siol', label: 'Siol.net' },
  { name: 'Slovenske novice', slug: 'slovenskenovice', label: 'Slovenske novice' },
  { name: 'Delo', slug: 'delo', label: 'Delo' },
  { name: 'Dnevnik', slug: 'dnevnik', label: 'Dnevnik' },
  { name: 'Žurnal24', slug: 'zurnal24', label: 'Žurnal24' },
  // fallback varianta brez šumnikov, če bi kdaj prišel "Zurnal24" iz feeda
  { name: 'Zurnal24', slug: 'zurnal24', label: 'Žurnal24' },
  { name: 'N1', slug: 'n1', label: 'N1' },
  { name: 'Svet24', slug: 'svet24', label: 'Svet24' },
]

/** Normalizacija za ključ (lowercase, brez šumnikov, trim) */
function normKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Index po normaliziranem imenu (news.source) */
const META_BY_NAME = new Map<string, SourceMeta>()
/** Index po slugu (če kdaj rabiš obraten lookup) */
const META_BY_SLUG = new Map<string, SourceMeta>()

for (const m of RAW_SOURCES) {
  META_BY_NAME.set(normKey(m.name), m)
  META_BY_SLUG.set(normKey(m.slug), m)
}

/**
 * Vrne metadata za podan vir.
 *
 * @param sourceName vrednost iz `news.source` (npr. "RTVSLO")
 */
export function getSourceMeta(sourceName?: string | null): SourceMeta | undefined {
  if (!sourceName) return undefined
  const key = normKey(sourceName)
  return META_BY_NAME.get(key)
}

/**
 * Vrne absolutno pot do logotipa v /public/logos/<slug>.png,
 * ali null, če vira ne najde.
 *
 * Primer: getSourceLogoPath("RTVSLO") -> "/logos/rtvslo.png"
 */
export function getSourceLogoPath(sourceName?: string | null): string | null {
  const meta = getSourceMeta(sourceName)
  if (!meta) return null
  return `/logos/${meta.slug}.png`
}

/**
 * Če rabiš direktno seznam vseh podprtih virov (za dropdown, footer ipd.)
 */
export const ALL_SOURCES_META: SourceMeta[] = RAW_SOURCES.slice()
