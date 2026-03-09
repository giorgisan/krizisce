import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

export const maxDuration = 60; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
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
          promptData += `- Vir: ${item.source}\n  Naslov: "${item.title}"\n  Povzetek: "${snippet}"\n  [source_url]: "${item.link}"\n`
       })
    })

    const currentDate = new Intl.DateTimeFormat('sl-SI', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

    // POSODOBLJEN PROMPT ZA 0-100 SPEKTER
    const prompt = `
      You are an expert media analyst and fact-checker. Analyze how Slovenian media is reporting on the following ${topStories.length} events. 
      Use both the title and the provided snippet to evaluate the media framing.

      CRITICAL - TOPIC AND SUMMARY NAMING RULE:
      The 'topic' and 'summary' fields MUST be derived EXCLUSIVELY from article TITLES and snippet CONTENT.
      NEVER use the [source_url] path or slug to determine the topic, location, subject, or any factual detail.

      CRITICAL FACT-CHECKING RULE:
      Today's date is ${currentDate}. Keep valid political/professional titles, but correct outdated ones.

      NEW TASK: MEDIA DNA ON A 0-100 SPECTRUM
      Evaluate the "Media DNA" of every single source based on its TITLE and snippet using a scale from 0 to 100 for three dimensions:
      1. informativnost: 0 = "Clickbait vaba / Skrivanje dejstev", 100 = "Polna slika / Vsa dejstva prisotna".
      2. custveni_naboj: 0 = "Suho / Klinično / Dolgočasno", 100 = "Dramatizacija / Šok / Klicaji".
      3. pristranskost: 0 = "Samo nevtralna dejstva", 100 = "Uredniški spin / Vsiljevanje mnenja / Pristranskost".

      Additionally, for the overall event, you must write a 'consensus_headline'. This is a single, ultra-neutral, distilled headline created by combining the facts from all sources. It must answer Who, What, Where, and Consequence.

      CRITICAL REQUIREMENT: The analysis text and all JSON values MUST be written entirely in the SLOVENIAN language.

      INPUT DATA:
      ${promptData}
    `

    // POSODOBLJENA SHEMA ZA INTEGER 0-100
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

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-pro",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.2, 
        }
    }); 

    const result = await model.generateContent(prompt);
    const analysisText = result.response.text();
    let analysisData = JSON.parse(analysisText);

    const finalData = analysisData.map((aiItem: any, index: number) => {
        const originalGroup = topStories[index];
        if (originalGroup) {
            aiItem.main_image = originalGroup.image || null;
        }
        return aiItem;
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

    return res.status(200).json({ success: true, count: finalData.length, data: finalData })

  } catch (e: any) {
      console.error("Monitor AI Error:", e)
      return res.status(500).json({ error: e.message })
  }
}
