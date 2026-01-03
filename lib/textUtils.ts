// lib/textUtils.ts

// 1. SEZNAM STOP BESED (Razširjen na podlagi analize baze)
const STOP_WORDS = new Set([
  // --- ZVEZNIKI IN PREDLOGI ---
  'in', 'ali', 'pa', 'da', 'se', 'je', 'bi', 'so', 'bo', 'za', 'na', 'v', 'pri', 'po', 'do', 
  'od', 'ob', 'z', 's', 'k', 'h', 'o', 'a', 'ampak', 'tudi', 'še', 'že', 'ker', 'kot', 'ki',
  'ko', 'ce', 'ne', 'ni', 'saj', 'te', 'ta', 'to', 'ti', 'tist', 'vse', 'vec', 'manj',
  'tem', 'temveč', 'zato', 'namrec', 'kljub', 'sicer', 'glede', 'zaradi', 'proti', 'med', 'pred', 'cez', 'brez',
  
  // --- GENERIČNE LOKACIJE (Če niso del specifičnega imena) ---
  'slovenija', 'sloveniji', 'slovenije', 'slovenski', 'slovenska', 'slovensko',
  'svet', 'svetu', 'evropa', 'eu', 'zda', 'drzava', 'mesto', 'kraj', 'obcina',

  // --- ČASOVNI PRISLOVI (Največji šum!) ---
  'leto', 'leta', 'let', 'danes', 'vceraj', 'jutri', 'nocoj', 'zjutraj', 'zvecer', 'ponoci',
  'letos', 'lani', 'letosnji', 'lanski', 'teden', 'vikend', 'mesec', 'kmalu', 'zdaj', 'trenutno',
  'dnevni', 'dnevn', 'tedenski', 'tedensk', 'mesecni', 'mesecn', 'cas', 'ura', 'ure', 'minut',
  'zacetek', 'konec', 'koncu', 'zacetku', 'sredini', 'obdobje', 'prihodnje', 'preteklo',

  // --- MEDIJSKI ŽARGON & CLICKBAIT ---
  'video', 'foto', 'clanek', 'novica', 'preberite', 'poglejte', 'razkrivamo', 'razkriva', 'preverite',
  'sok', 'sokantno', 'neverjetno', 'noro', 'ekskluzivno', 'intervju', 'v zivo', 'izjava', 'komentar',
  'odziv', 'sporocilo', 'podrobnosti', 'resnica', 'ozadje', 'zgodba', 'drama', 'tragedija', 'skandal',
  
  // --- GENERIČNI GLAGOLI (Ki se pojavljajo v naslovih) ---
  'lahko', 'mora', 'imajo', 'gre', 'pravi', 'znano', 'novo', 'prisel', 'odsel', 'ostal', 'postaja',
  'dobili', 'izgubili', 'nasli', 'iskali', 'cakajo', 'pripravlja', 'napoveduje', 'opozarja',
  'sporocil', 'potrdil', 'zavrnil', 'dejal', 'meni', 'trdi', 'pokazal', 'razlozil',

  // --- KOLIČINA IN PRIDEVNIKI ---
  'velik', 'veliki', 'mali', 'majhen', 'dobra', 'slaba', 'hud', 'huda', 'visok', 'nizek',
  'prvi', 'drugi', 'tretji', 'nov', 'nova', 'star', 'stara', 'mlad', 'mlada',
  'vecina', 'manjsina', 'stevilo', 'polovica', 'del', 'vsi', 'vsak', 'nek', 'neka', 'neko',
  'glavni', 'pomemben', 'uspesen', 'znan', 'priljubljen',
  
  // --- ZAIMKI ---
  'svoj', 'svoja', 'svoje', 'njegov', 'njen', 'njihov', 'nas', 'vas', 'moj', 'tvoj'
]);

// 2. HELPER ZA ODSTRANJEVANJE ŠUMNIKOV
const unaccent = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// 3. NAPREDNEJŠI "STEMMER" ZA SLOVENŠČINO
function stemWord(word: string): string {
  // Če je beseda prekratka, je ne tikamo (npr. "sir", "pot", "trk")
  if (word.length <= 3) return word; 

  // Končnice morajo biti urejene od NAJDALJŠE do NAJKRAJŠE.
  const suffixes = [
    'ovanjem', 'ovanje', 'ovanju', 'ovanja', 'ovanih', // Glagolniki
    'skega', 'skemu', 'skem', 'skih', 'skim', // Pridevniki
    'ega', 'em', 'ih', 'im', 'om', 'mi', // Sklanjanje
    'jem', 'ja', 'ju', 'je', 'ji', 'jo', // Sklanjanje
    'a', 'e', 'i', 'o', 'u' // Osnovni samoglasniki
  ];

  for (const suffix of suffixes) {
    if (word.endsWith(suffix)) {
      const potentialStem = word.slice(0, -suffix.length);
      // VAROVALKA: Koren mora ostati dolg vsaj 3 znake
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

  // A) Očistimo tekst (odstranimo ločila, šumnike, v lowercase)
  const cleanText = unaccent(text.toLowerCase())
    .replace(/[^a-z0-9\s]/g, ' ') 
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

    // E) Še zadnji filter korena in dodajanje
    // Preverimo, če je koren slučajno stop word (npr. "novi" -> "nov" (stop))
    if (stem.length >= 3 && !STOP_WORDS.has(stem)) {
      keywords.add(stem);
    }
  }

  // Vrnemo kot array
  return Array.from(keywords);
}
