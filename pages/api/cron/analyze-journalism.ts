import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

// SPREMEMBA 1: DODAN MAX DURATION ZA VERCEL (prepreči timeout po 15 sekundah)
export const maxDuration = 60; 

// Inicializacija klientov
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Preverjanje avtorizacije
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. ZAJEM IZ CACHE TABELE
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

    // 2. Izbor prvih 5 skupin
    const topStories = allGroups.slice(0, 5)

    // 3. Priprava podatkov za AI
    let promptData = ""
    topStories.forEach((group: any, index: number) => {
       promptData += `\nZGODBA ${index + 1}:\n`
       const mainArticle = { 
           source: group.source, 
           title: group.title, 
           link: group.link,
           snippet: group.contentsnippet || group.contentSnippet || ''
       };
       const otherArticles = group.storyArticles || [];
       const allInGroup = [mainArticle, ...otherArticles];
       
       allInGroup.slice(0, 8).forEach((item: any) => {
          const snippet = item.snippet || item.contentsnippet || item.contentSnippet || '';
          promptData += `- Vir: ${item.source}, Naslov: "${item.title}", URL: "${item.link}", Povzetek: "${snippet}"\n`
       })
    })

    const currentDate = new Intl.DateTimeFormat('sl-SI', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

    // 4. Optimiziran prompt z generičnim, future-proof pravilom
    const prompt = `
      You are an expert media analyst. Analyze how Slovenian media is reporting on the following ${topStories.length} events. 
      Use both the title and the provided snippet to evaluate the media framing and editorial approach.

      Categorize the tone/approach of each source using ONLY one of the following exact Slovenian terms:
      - Nevtralno (dry listing of facts, "who/what/when", neutral, no emotional adjectives)
      - Dramatično (clickbait, emphasizes shock, drama, fear, uses strong emotional adjectives, focuses on extreme aspects)
      - Poglobljeno (in-depth, explains the "why", consequences, historical context, expert opinions, systemic view)
      - Kritično (focuses on pointing fingers, blaming, highlighting incompetence of actors/government, opinionated tone)
      
      CRITICAL FACT-CHECKING RULE (TEMPORAL AWARENESS):
      Today's date is ${currentDate}. You must KEEP valid political and professional titles to provide good context, BUT you must be accurate.
      - NEVER add "nekdanji" or "bivši" to a title unless it explicitly appears in the source snippet AND is still true today.
      - EXAMPLE OF CORRECT BEHAVIOR: If a source snippet uses "nekdanji" or "bivši" for someone who currently holds that office as of ${currentDate}, correct it to their active title. Do not blindly copy factual errors about people's current roles from source snippets.
      
      CRITICAL REQUIREMENT: The analysis text and all JSON values MUST be written entirely in the SLOVENIAN language.
      
      INPUT DATA:
      ${promptData}
    `

    // Strict JSON schema definition za Gemini
    const responseSchema = {
      type: SchemaType.ARRAY,
      description: "Seznam analiziranih medijskih zgodb.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          topic: {
            type: SchemaType.STRING,
            description: "Nevtralen naslov dogodka (max 5 besed)."
          },
          summary: {
            type: SchemaType.STRING,
            description: "A detailed, factual 3 to 4 sentence summary of the story based on the provided snippets. Include key names, specific numbers, actions, and locations mentioned in the text. This will be used as primary reference for a morning briefing."
          },
          framing_analysis: {
            type: SchemaType.STRING,
            description: "Kratek odstavek (2-3 stavki), ki primerja pristope različnih medijev k tej zgodbi."
          },
          sources: {
            type: SchemaType.ARRAY,
            description: "Seznam virov, ki poročajo o zgodbi.",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                source: { type: SchemaType.STRING },
                title: { type: SchemaType.STRING },
                url: { type: SchemaType.STRING },
                tone: { 
                  type: SchemaType.STRING,
                  description: "Ena od vrednosti: Nevtralno, Dramatično, Poglobljeno, Kritično."
                }
              },
              required: ["source", "title", "url", "tone"]
            }
          }
        },
        required: ["topic", "summary", "framing_analysis", "sources"]
      }
    };

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-pro",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.2, // Znižano za večjo natančnost
        }
    }); 

    const result = await model.generateContent(prompt);
    const analysisText = result.response.text();
    let analysisData = JSON.parse(analysisText);

    // 5. Pripis slik iz originalnih skupin nazaj v AI JSON
    const finalData = analysisData.map((aiItem: any, index: number) => {
        const originalGroup = topStories[index];
        if (originalGroup) {
            aiItem.main_image = originalGroup.image || null;
        }
        return aiItem;
    });

    // 6. Shranjevanje v media_analysis tabelo
    const { error: insertError } = await supabase.from('media_analysis').insert({ 
        data: finalData
    })

    if (insertError) throw insertError;

    // --- 7. TAKOJŠNJA OSVEŽITEV CACHE-A (On-Demand Revalidation) ---
    try {
        await res.revalidate('/analiza');
        console.log("Stran /analiza je bila uspešno osvežena na Vercelu!");
    } catch (revalidateError) {
        console.error('Napaka pri revalidaciji:', revalidateError);
    }
    // ---------------------------------------------------------------

    return res.status(200).json({ success: true, count: finalData.length, data: finalData })

  } catch (e: any) {
      console.error("Monitor AI Error:", e)
      return res.status(500).json({ error: e.message })
  }
}
