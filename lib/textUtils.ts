// lib/textUtils.ts

// 1. SEZNAM STOP BESED (Razširjen)
const STOP_WORDS = new Set([
  'in', 'ali', 'pa', 'da', 'se', 'je', 'bi', 'so', 'bo', 'za', 'na', 'v', 'pri', 'po', 'do', 
  'od', 'ob', 'z', 's', 'k', 'h', 'o', 'a', 'ampak', 'tudi', 'še', 'že', 'ker', 'kot', 'ki',
  'ko', 'ce', 'ne', 'ni', 'saj', 'te', 'ta', 'to', 'ti', 'tist', 'vse', 'vec', 'manj', 
  'slovenija', 'sloveniji', 'slovenije', // Pogosto v naslovih, a ne nosi kategorije
  'leto', 'leta', 'let', 'danes', 'vceraj', 'jutri',
  'video', 'foto', 'clanek', 'novica', 'preberite', 'poglejte',
  'zakaj', 'kako', 'kaj', 'kje', 'kdaj', 'kdo',
  'zaradi', 'glede', 'proti', 'med', 'pred', 'cez', 'brez',
  'lahko', 'mora', 'imajo', 'gre', 'pravi', 'znano', 'novo',
  // --- NOVE STOP BESEDE (za boljše ujemanje tagov) ---
  'dnevni', 'dnevn', 'tedenski', 'tedensk', 'mesecni', 'mesecn', 
  'velik', 'veliki', 'mali', 'dobra', 'slaba', 'prvi', 'drugi', 'tretji'
]);

// 2. HELPER ZA ODSTRANJEVANJE ŠUMNIKOV
const unaccent = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// 3. NAPREDNEJŠI "STEMMER" ZA SLOVENŠČINO
// Namen: Iz "stanovanje", "stanovanja" narediti "stan". Iz "lučke" narediti "luck".
function stemWord(word: string): string {
  // Če je beseda prekratka, je ne tikamo (npr. "sir", "pot")
  if (word.length <= 3) return word; 

  // Končnice morajo biti urejene od NAJDALJŠE do NAJKRAJŠE.
  // Tako preprečimo, da bi pri "delovanje" odrezali samo "e", namesto "anje".
  const suffixes = [
    'ovanjem', 'ovanje', 'ovanju', 'ovanja', 'ovanih', // Glagolniki (potovanje)
    'skega', 'skemu', 'skem', 'skih', 'skim', // Pridevniki (slovenska)
    'ega', 'em', 'ih', 'im', 'om', 'mi', // Sklanjanje
    'jem', 'ja', 'ju', 'je', 'ji', 'jo', // Sklanjanje
    'a', 'e', 'i', 'o', 'u' // Osnovni samoglasniki
  ];

  for (const suffix of suffixes) {
    if (word.endsWith(suffix)) {
      // Odrežemo končnico
      const potentialStem = word.slice(0, -suffix.length);
      
      // VAROVALKA: Koren mora ostati dolg vsaj 3 znake (razen če je original kratek)
      // Primer: "voda" (-a) -> "vod" (OK). "jeza" (-a) -> "jez" (OK).
      if (potentialStem.length >= 3) {
        return potentialStem;
      }
    }
  }
  
  return word;
}

// 4. GLAVNA FUNKCIJA
export function generateKeywords(text: string): string[] {
  if (!text) return [];

  // A) Očistimo tekst
  const cleanText = unaccent(text.toLowerCase())
    .replace(/[^a-z0-9\s]/g, ' ') // Samo črke in številke
    .trim();

  // B) Razbijemo na besede
  const tokens = cleanText.split(/\s+/);
  
  const keywords = new Set<string>();

  for (const token of tokens) {
    // C) Filtriramo smeti
    if (token.length < 3) continue; // Prekratke besede
    if (STOP_WORDS.has(token)) continue; // Stop besede

    // D) "Stemming" (Korenjenje)
    const stem = stemWord(token);

    // E) Še zadnji filter in dodajanje
    if (stem.length >= 3 && !STOP_WORDS.has(stem)) {
      keywords.add(stem);
    }
  }

  // Vrnemo kot array
  return Array.from(keywords);
}
