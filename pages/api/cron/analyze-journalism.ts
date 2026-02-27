import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

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
    // 1. ZAJEM IZ CACHE TABELE (vzame najnovejšo grupacijo, enako kot naslovnica)
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

    // 2. Izbor prvih 5 skupin (Top stories)
    const topStories = allGroups.slice(0, 5)

    // 3. Priprava podatkov za AI (DODAN POVZETEK - CONTENTSNIPPET)
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
          // Uporabimo povzetek iz snippetov za globljo analizo tona
          const snippet = item.snippet || item.contentsnippet || item.contentSnippet || '';
          promptData += `- Vir: ${item.source}, Naslov: "${item.title}", Povzetek: "${snippet}"\n`
       })
    })

    // 4. Optimiziran prompt z akademskimi "framing" kategorijami
    const prompt = `
      You are an expert media analyst. Analyze how Slovenian media is reporting on the following ${topStories.length} events. 
      Use both the title and the provided snippet to evaluate the media framing.

      Categorize the tone/frame of each source using ONLY one of the following exact Slovenian terms:
      - Epizodično (focus on the individual, specific isolated incident, emotions, and drama)
      - Tematsko (broader societal/systemic context, seeking solutions, statistics)
      - Konfliktno (focus on dispute, arguments, 'us vs. them', polarization)
      - Ekonomsko (focus strictly on financial costs and economic impact)
      - Informativno (dry listing of facts with no added emotional or analytical value)
      
      CRITICAL REQUIREMENT: The analysis text and all JSON values MUST be written entirely in the SLOVENIAN language.
      
      INPUT DATA:
      ${promptData}
    `

    // Strict JSON schema definition za Gemini z uporabo SchemaType
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
            description: "Bistvo dogodka v enem stavku."
          },
          framing_analysis: {
            type: SchemaType.STRING,
            description: "Kratek odstavek (2-3 stavki), ki primerja, kateri mediji so uporabili epizodičen/konflikten okvir in kateri tematski/informativen."
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
                  description: "Ena od vrednosti: Epizodično, Tematsko, Konfliktno, Ekonomsko, Informativno."
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
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
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

    return res.status(200).json({ success: true, count: finalData.length, data: finalData })

  } catch (e: any) {
      console.error("Monitor AI Error:", e)
      return res.status(500).json({ error: e.message })
  }
}
