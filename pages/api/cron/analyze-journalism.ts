import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import crypto from 'crypto' 

export const maxDuration = 60; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // --- VARNOSTNI POPRAVEK: Preprečevanje Timing Attacka ---
  const expectedKey = process.env.CRON_SECRET || 'fallback_secret';
  const providedKey = (req.query.key as string) || '';

  const a = Buffer.alloc(32);
  const b = Buffer.alloc(32);
  
  Buffer.from(expectedKey).copy(a);
  Buffer.from(providedKey).copy(b);

  const isMatch = crypto.timingSafeEqual(a, b) && expectedKey.length === providedKey.length;

  if (!isMatch) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // --------------------------------------------------------

  try {
    // 1. Pridobivanje novic iz predpomnilnika
    const { data: cacheData, error: cacheError } = await supabase
      .from('trending_groups_cache')
      .select('data')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (cacheError || !cacheData) throw new Error("Napaka pri branju trending_groups_cache.")

    const allGroups = cacheData.data;
    if (!Array.isArray(allGroups) || allGroups.length === 0) {
        return res.json({ message: "Ni podatkov za analizo." })
    }

    const topStories = allGroups.slice(0, 5)

    // 2. Pridobivanje ZADNJE analize iz baze
    const { data: lastAnalysisObj } = await supabase
      .from('media_analysis')
      .select('data')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const lastAnalysisData = lastAnalysisObj?.data || [];

    // 3. LOGIKA ZA PRESKAKOVANJE (OPTIMIZACIJA)
    const groupsToAnalyze: { index: number, group: any }[] = [];
    const finalData = new Array(5).fill(null);

    topStories.forEach((group, index) => {
       // Preverimo, če se glavni link te skupine že nahaja v zadnji analizi
       const existingAnalysis = lastAnalysisData.find((aiItem: any) =>
          aiItem.source_urls && aiItem.source_urls.includes(group.link)
       );

       if (existingAnalysis) {
           // Zgodbo smo že analizirali, samo prekopiramo stare podatke na ustrezno mesto
           finalData[index] = existingAnalysis;
       } else {
           // To je povsem nova zgodba, pripravimo jo za AI
           groupsToAnalyze.push({ index, group });
       }
    });

    // Če so vse zgodbe že obdelane, zaključimo in prihranimo denar!
    if (groupsToAnalyze.length === 0) {
        console.log("Ni novih zgodb za analizo. Preskakujem AI klic.");
        return res.status(200).json({ success: true, message: "Brez sprememb. Vse zgodbe so že analizirane.", count: 0 });
    }

    // Priprava prompta SAMO za manjkajoče (nove) zgodbe
    let promptData = ""
    groupsToAnalyze.forEach((item, i) => {
       promptData += `\nZGODBA ${i + 1}:\n`
       const group = item.group;
       const mainArticle = { 
           source: group.source, 
           title: group.title, 
           link: group.link,
           snippet: group.contentsnippet || group.contentSnippet || ''
       };
       const otherArticles = group.storyArticles || [];
       const allInGroup = [mainArticle, ...otherArticles];
       
       allInGroup.slice(0, 8).forEach((article: any) => {
          const snippet = article.snippet || article.contentsnippet || article.contentSnippet || '';
          promptData += `- Vir: ${article.source}\n  Naslov: "${article.title}"\n  Povzetek: "${snippet}"\n  [source_url]: "${article.link}"\n`
       })
    })

    const today = new Date();
    const currentDate = new Intl.DateTimeFormat('sl-SI', { day: 'numeric', month: 'long', year: 'numeric' }).format(today);
    const currentYear = today.getFullYear(); 

    const prompt = `
      You are an expert media analyst and fact-checker. Analyze how Slovenian media is reporting on the following ${groupsToAnalyze.length} events. 
      Use both the title and the provided snippet to evaluate the media framing.

      CRITICAL - TOPIC AND SUMMARY NAMING RULE:
      The 'topic' and 'summary' fields MUST be derived EXCLUSIVELY from article TITLES and snippet CONTENT.
      NEVER use the [source_url] path or slug to determine the topic, location, subject, or any factual detail.

      CRITICAL FACT-CHECKING RULE (ANTI-HALLUCINATION):
      Today's date is ${currentDate} and the current year is ${currentYear}. 
      1. You MUST NEVER add chronological titles like "nekdanji" (former) or "bivši" (ex) to political figures or positions UNLESS the word is EXPLICITLY written in the source snippets.
      2. If the source says "Donald Trump", you must output "Donald Trump". Do NOT automatically prepend "nekdanji predsednik".
      3. Keep valid political/professional titles, but correct outdated ones based on the current year (${currentYear}).

      NEW TASK: MEDIA DNA ON A 0-100 SPECTRUM
      Evaluate the "Media DNA" of every single source based on its TITLE and snippet using a scale from 0 to 100 for three dimensions:
      1. informativnost: 0 = "Clickbait vaba / Skrivanje dejstev", 100 = "Polna slika / Vsa dejstva prisotna".
      2. custveni_naboj: 0 = "Suho / Klinično / Dolgočasno", 100 = "Dramatizacija / Šok / Klicaji".
      3. pristranskost: 0 = "Samo nevtralna dejstva", 100 = "Uredniški spin / Vsiljevanje mnenja / Pristranskost".

      Additionally, for the overall event, you must write a 'consensus_headline'. This is a single, ultra-neutral, distilled headline created by combining the facts from all sources. It must answer Who, What, Where, and Consequence.
      
      NEW TASK: QUOTE EXTRACTION WITH EXACT SOURCE URL (OPTIONAL BUT HIGHLY ENCOURAGED)
      If there is a striking, important, or controversial DIRECT QUOTE mentioned in the snippets for this story, extract it EXACTLY word-for-word in the 'key_quote' object. Do not paraphrase. 
      CRITICAL: You MUST also provide the exact [source_url] of the specific snippet where you found this quote. If no direct quote is present, omit the 'key_quote' field completely.

      CRITICAL REQUIREMENT: The analysis text and all JSON values MUST be written entirely in the SLOVENIAN language.

      INPUT DATA:
      ${promptData}
    `

    const responseSchema = {
      type: SchemaType.ARRAY,
      description: "Seznam analiziranih medijskih zgodb.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          topic: { type: SchemaType.STRING, description: "Nevtralen naslov dogodka (max 5 besed)." },
          consensus_headline: { type: SchemaType.STRING, description: "A neutral, distilled headline combining facts from all sources." },
          summary: { type: SchemaType.STRING, description: "A detailed, factual 3 to 4 sentence summary of the story based STRICTLY on titles and snippets." },
          framing_analysis: { type: SchemaType.STRING, description: "Kratek odstavek (2-3 stavki), ki primerja pristope različnih medijev k tej zgodbi." },
          key_quote: {
            type: SchemaType.OBJECT,
            description: "OPTIONAL: The most important, exact direct quote from the story and its exact source URL.",
            properties: {
                quote: { type: SchemaType.STRING, description: "The EXACT word-for-word quote in Slovenian." },
                author: { type: SchemaType.STRING, description: "The name of the person who said it." },
                source_url: { type: SchemaType.STRING, description: "The EXACT [source_url] from the INPUT DATA where this quote was found." }
            },
            required: ["quote", "author", "source_url"]
          },
          sources: {
            type: SchemaType.ARRAY,
            description: "Seznam virov in njihov Medijski DNK.",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                source: { type: SchemaType.STRING },
                title: { type: SchemaType.STRING },
                url: { type: SchemaType.STRING },
                media_dna: {
                    type: SchemaType.OBJECT,
                    description: "Analiza treh ključnih signalov na lestvici 0-100.",
                    properties: {
                        informativnost: { type: SchemaType.INTEGER, description: "Od 0 (Clickbait vaba) do 100 (Polna slika)." },
                        custveni_naboj: { type: SchemaType.INTEGER, description: "Od 0 (Suho/Klinično) do 100 (Dramatizacija)." },
                        pristranskost: { type: SchemaType.INTEGER, description: "Od 0 (Samo dejstva) do 100 (Uredniški spin)." }
                    },
                    required: ["informativnost", "custveni_naboj", "pristranskost"]
                }
              },
              required: ["source", "title", "url", "media_dna"]
            }
          }
        },
        required: ["topic", "consensus_headline", "summary", "framing_analysis", "sources"]
      }
    };

    const modelsToTry = [
        "gemini-3.1-pro-preview", 
        "gemini-2.5-pro",         
        "gemini-2.5-flash"        
    ];

    let analysisData = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`🤖 Poskušam AI analizo z modelom: ${modelName} za ${groupsToAnalyze.length} novih zgodb...`);
            const model = genAI.getGenerativeModel({ 
                model: modelName, 
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                    temperature: 0.2, 
                }
            }); 

            const result = await model.generateContent(prompt);
            const parsed = JSON.parse(result.response.text());
            
            if (parsed && Array.isArray(parsed)) {
                analysisData = parsed;
                console.log(`✅ AI uspešen z modelom: ${modelName}`);
                break;
            }
        } catch (err: any) {
            console.warn(`⚠️ Model ${modelName} ni uspel: ${err.message}. Preklapljam na naslednjega...`);
        }
    }

    if (!analysisData) {
        throw new Error("❌ Vsi AI modeli so odpovedali ali vrnili neveljaven odgovor.");
    }

    // Združevanje novih in starih analiz nazaj v pravilni vrstni red (top 5)
    groupsToAnalyze.forEach((item, aiIndex) => {
        const aiItem = analysisData[aiIndex];
        const originalGroup = item.group;
        
        if (originalGroup && aiItem) {
            aiItem.main_image = originalGroup.image || null;
            aiItem.source_urls = originalGroup.storyArticles 
                ? [originalGroup.link, ...originalGroup.storyArticles.map((a: any) => a.link)]
                : [originalGroup.link];
            
            finalData[item.index] = aiItem;
        }
    });

    const { error: insertError } = await supabase.from('media_analysis').insert({ 
        data: finalData
    })

    if (insertError) throw insertError;

    try {
        await res.revalidate('/analiza');
    } catch (revalidateError) {
        console.error('Napaka pri revalidaciji:', revalidateError);
    }

    return res.status(200).json({ success: true, count: finalData.length, newlyAnalyzed: groupsToAnalyze.length, data: finalData })

  } catch (e: any) {
      console.error("Monitor AI Error:", e)
      return res.status(500).json({ error: e.message })
  }
}
