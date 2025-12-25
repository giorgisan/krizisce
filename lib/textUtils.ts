// lib/textUtils.ts

// Besede, ki jih ignoriramo (šum)
const STOP_WORDS = new Set([
  'in', 'ali', 'pa', 'da', 'se', 'je', 'bi', 'so', 'bo', 'za', 'na', 'v', 'pri', 'po', 'do', 
  'od', 'ob', 'z', 's', 'k', 'h', 'o', 'a', 'ampak', 'tudi', 'še', 'že', 'ker', 'kot', 'ki',
  'ko', 'ce', 'ne', 'ni', 'saj', 'te', 'ta', 'to', 'ti', 'tist', 'vse', 'vec', 'manj', 
  'slovenija', 'leto', 'danes', 'video', 'foto' // Lahko dodaš še več splošnih
]);

// Funkcija za odstranjevanje šumnikov
const unaccent = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Glavna funkcija za generiranje ključnih besed
export function generateKeywords(text: string): string[] {
  if (!text) return [];

  // 1. Očistimo tekst (male črke, brez šumnikov, brez ločil)
  const cleanText = unaccent(text.toLowerCase())
    .replace(/[^a-z0-9\s]/g, ' ') // Ohranimo samo črke in številke
    .trim();

  // 2. Razbijemo na besede
  const tokens = cleanText.split(/\s+/);
  
  const keywords = new Set<string>();

  for (const token of tokens) {
    // Filtriramo prekratke besede in stop words
    if (token.length < 3) continue;
    if (STOP_WORDS.has(token)) continue;

    // 3. "POOR MAN'S STEMMER" za Slovenščino
    // Odrežemo pogoste končnice, da dobimo koren.
    // Vrstni red je pomemben (daljše končnice najprej)!
    let stem = token;
    
    // Zelo grobo pravilo: če se konča na samoglasnik ali pogoste končnice,reži.
    // To ni jezikovno popolno, ampak za ISKANJE je odlično, ker naredi isto za poizvedbo in vnos.
    
    // Primer: Cinkarna -> Cinkarn, Cinkarni -> Cinkarn
    if (stem.endsWith('ega')) stem = stem.slice(0, -3);
    else if (stem.endsWith('ih')) stem = stem.slice(0, -2);
    else if (stem.endsWith('im')) stem = stem.slice(0, -2);
    else if (stem.endsWith('om')) stem = stem.slice(0, -2);
    else if (stem.endsWith('em')) stem = stem.slice(0, -2);
    else if (stem.endsWith('a')) stem = stem.slice(0, -1);
    else if (stem.endsWith('e')) stem = stem.slice(0, -1);
    else if (stem.endsWith('i')) stem = stem.slice(0, -1);
    else if (stem.endsWith('o')) stem = stem.slice(0, -1);
    else if (stem.endsWith('u')) stem = stem.slice(0, -1);

    // Še enkrat preverimo dolžino po rezanju
    if (stem.length >= 3) {
      keywords.add(stem);
    }
  }

  return Array.from(keywords);
}
