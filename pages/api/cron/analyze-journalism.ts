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

  if (!isMatch) return res.status(401).json({ error: 'Unauthorized' });

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

    // 2. Pridobivanje ZADNJE analize za optimizacijo
    const { data: lastAnalysisObj } = await supabase
      .from('media_analysis')
      .select('data')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const lastAnalysisData = lastAnalysisObj?.data || [];
    const groupsToAnalyze: { index: number, group: any }[] = [];
    const finalData = new Array(topStories.length).fill(null);

    topStories.forEach((group, index) => {
       const existingAnalysis = lastAnalysisData.find((aiItem: any) =>
          aiItem.source_urls && aiItem.source_urls.includes(group.link)
       );
       if (existingAnalysis) {
           finalData[index] = existingAnalysis;
       } else {
           groupsToAnalyze.push({ index, group });
       }
    });

    if (groupsToAnalyze.length === 0) {
        console.log("🚀 Vse zgodbe so že analizirane. Preskakujem AI.");
        return res.status(200).json({ success: true, message: "Brez novih zgodb." });
    }

    // 3. Priprava podatkov za prompt (povečan nabor na 12 virov za globino)
    let promptData = ""
    groupsToAnalyze.forEach((item, i) => {
       promptData += `\nZGODBA ${i + 1}:\n`
       const group = item.group;
       const mainArticle = { source: group.source, title: group.title, link: group.link, snippet: group.contentsnippet || group.contentSnippet || '' };
       const otherArticles = group.storyArticles || [];
       const allInGroup = [mainArticle, ...otherArticles];
       
       allInGroup.slice(0, 12).forEach((article: any) => {
          const snippet = article.snippet || article.contentsnippet || article.contentSnippet || '';
          promptData += `- Vir: ${article.source}\n  Naslov: "${article.title}"\n  Povzetek: "${snippet}"\n  [source_url]: "${article.link}"\n`
       })
    })

    const today = new Date();
    const currentDate = new Intl.DateTimeFormat('sl-SI', { day: 'numeric', month: 'long', year: 'numeric' }).format(today);
    const currentYear = today.getFullYear();

    const prompt = `
      You are an expert media analyst and fact-checker. Analyze how Slovenian media is reporting on the following ${groupsToAnalyze.length} events.
      Today is ${currentDate}. Current year is ${currentYear}.

      CRITICAL RULES:
      1. LANGUAGE: The entire output MUST be in SLOVENIAN.
      2. TOPIC/SUMMARY: Derive EXCLUSIVELY from TITLES and snippets. NEVER use [source_url] strings to guess facts.
      3. ANTI-HALLUCINATION: NEVER add "nekdanji" or "bivši" to political titles unless explicitly in the source. Donald Trump is "Donald Trump", not automatically "nekdanji predsednik".
      4. STATEMENTS & QUOTES (WORD-FOR-WORD ONLY): Look for the most impactful piece of information to highlight.
         - Priority 1: A striking direct quote from a person involved.
         - Priority 2: If no direct quote is found, extract a powerful, distinctive sentence or claim EXACTLY as written.
         - CRITICAL: It MUST be an EXACT word-for-word match from the snippets. Do NOT paraphrase, summarize, or edit. 
         - If the source text is too generic to provide an interesting highlight, omit the 'key_quote' object.
         - You MUST provide the exact [source_url] of the snippet where this text was found.

      INPUT DATA:
      ${promptData}
    `

    const responseSchema = {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          topic: { type: SchemaType.STRING },
          consensus_headline: { type: SchemaType.STRING },
          summary: { type: SchemaType.STRING },
          framing_analysis: { type: SchemaType.STRING },
          key_quote: {
            type: SchemaType.OBJECT,
            properties: {
                quote: { type: SchemaType.STRING },
                author: { type: SchemaType.STRING },
                source_url: { type: SchemaType.STRING }
            },
            required: ["quote", "author", "source_url"]
          },
          sources: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                source: { type: SchemaType.STRING },
                title: { type: SchemaType.STRING },
                url: { type: SchemaType.STRING },
                media_dna: {
                    type: SchemaType.OBJECT,
                    properties: {
                        informativnost: { type: SchemaType.INTEGER },
                        custveni_naboj: { type: SchemaType.INTEGER },
                        pristranskost: { type: SchemaType.INTEGER }
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

    // --- KLIC AI MODELA S FALLBACK LOGIKO ---
    const modelsToTry = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"];
    let analysisData = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`🤖 Poskušam AI z modelom: ${modelName}...`);
            const model = genAI.getGenerativeModel({ 
                model: modelName, 
                generationConfig: { responseMimeType: "application/json", responseSchema: responseSchema, temperature: 0.2 }
            }); 
            const result = await model.generateContent(prompt);
            const parsed = JSON.parse(result.response.text());
            if (parsed && Array.isArray(parsed)) {
                analysisData = parsed;
                console.log(`✅ Uspeh z modelom: ${modelName}`);
                break;
            }
        } catch (err: any) {
            console.warn(`⚠️ Model ${modelName} ni uspel: ${err.message}`);
        }
    }

    if (!analysisData) throw new Error("Vsi AI modeli so odpovedali.");

    // 4. Združevanje podatkov
    groupsToAnalyze.forEach((item, aiIndex) => {
        const aiItem = analysisData[aiIndex];
        if (item.group && aiItem) {
            aiItem.main_image = item.group.image || null;
            aiItem.source_urls = [item.group.link, ...(item.group.storyArticles?.map((a: any) => a.link) || [])];
            finalData[item.index] = aiItem;
        }
    });

    const { error: insertError } = await supabase.from('media_analysis').insert({ data: finalData })
    if (insertError) throw insertError;

    // 5. CLAUDE'S FIX: Varna revalidacija
    try {
        await res.revalidate('/analiza');
    } catch (revalidateError) {
        console.error('Napaka pri revalidaciji (vsebina je v bazi, stran se bo osvežila pozneje):', revalidateError);
    }

    return res.status(200).json({ success: true, count: finalData.length, newlyAnalyzed: groupsToAnalyze.length });

  } catch (e: any) {
      console.error("Monitor AI Error:", e);
      return res.status(500).json({ error: e.message });
  }
}
