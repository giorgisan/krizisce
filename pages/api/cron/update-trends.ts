import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const hour = (new Date().getUTCHours() + 1) % 24;
  if (hour >= 22 || hour < 4) {
    console.log(`Nočni mir (ura: ${hour}:00). Preskakujem AI.`);
    return res.status(200).json({ success: true, message: 'Nočni premor.' });
  }

  let trends: string[] = []
  let usedModel = 'unknown'
  
  try {
    // 1. ZAJEM NOVIC - Zamenjali 'summary' s 'contentsnippet'
    const { data: allNews, error } = await supabase
      .from('news')
      .select('title, contentsnippet, publishedat, source')
      .neq('category', 'oglas')
      .neq('category', 'promo')
      .order('publishedat', { ascending: false })
      .limit(200)

    if (error) throw error
    if (!allNews || allNews.length === 0) {
        return res.status(200).json({ success: false, message: 'Baza je prazna.' })
    }

    // 2. PRIPRAVA VSEBINE - Uporabimo n.contentsnippet namesto n.summary
    const headlines = allNews.map(n => `- ${n.source}: ${n.title} (Povzetek: ${n.contentsnippet?.substring(0, 100)}...)`).join('\n')

    // 3. PROMPT
    const prompt = `
        Kot izkušen urednik slovenskega novičarskega portala analiziraj spodnji seznam naslovov zadnjih novic.
        Tvoja naloga je ustvariti dinamičen in raznolik seznam trendov (#TemeDneva), ki so trenutno najbolj aktualni.

        VHODNI PODATKI:
        ${headlines}

        STRATEGIJA IZBORA:
        1. RELEVANTNOST: Izpostavi teme, o katerih piše več različnih virov (npr. RTV, 24ur, Delo, Siol).
        2. BREZ PODVAJANJA: Ne ustvarjaj vsebinsko podobnih tagov.
        
        KRITERIJI ZA TAG:
        1. UPORABNOST PRI ISKANJU: Tag mora vsebovati besede, ki se nahajajo v naslovih oz. podnaslovih novic.
           - SLABO: #Politično Dogajanje (preveč splošno, te besede ni v naslovih)
           - DOBRO: #Golob (če se v naslovih omenja premier Golob)
           - DOBRO: #Vojna v Ukrajini (če se v naslovih omenja Ukrajina/vojna)

        2. KONKRETNOST: Raje uporabi imena oseb, krajev ali dogodkov kot pa abstraktne pojme.
           - Namesto #Kriminal uporabi #Umor v Mariboru (če je to tema).
           - Namesto #Šport uporabi #Dončić (če je tema Luka Dončić).

        PRAVILA OBLIKOVANJA (STROGO):
        - Vrni IZKLJUČNO JSON array stringov: ["#Tag1", "#Tag2", ...]
        - Vsak tag se mora začeti z lojtro (#).
        - Uporabljaj slovenski jezik in presledke (NE CamelCase).
        - Dolžina: 1 do 3 besede na tag.
        - Besede naj bodo v osnovni obliki (imenovalnik), da se ujemajo z iskalnim indeksom.
        - Uporabljaj izključno besede, ki se v dobesedni obliki ali korenu pojavljajo v naslovih. 
        - Ne spreminjaj glagolov v samostalnike, če to spremeni koren besede.
        
        PREPOVEDANO
        - Izogibaj se generičnim besedam kot so "Šport", "Novice", "Dogajanje", "Stanje", "Foto" ... razen če so del specifične fraze.
        - Ne izmišljuj si besed (ne haluciniraj)

        CILJ: Vrni med 6 in 12 najbolj relevantnih tagov za premikajoči se trak.
    `
    
    const tryGenerate = async (modelName: string) => {
        const model = genAI.getGenerativeModel({ 
            model: modelName,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        })
        const result = await model.generateContent(prompt)
        const responseText = result.response.text()
        const jsonStart = responseText.indexOf('[');
        const jsonEnd = responseText.lastIndexOf(']') + 1;
        const cleanJson = responseText.substring(jsonStart, jsonEnd);
        return JSON.parse(cleanJson)
    }

    try {
        console.log("Poskušam gemini-3-flash-preview...");
        usedModel = "gemini-3-flash-preview";
        trends = await tryGenerate(usedModel);
    } catch (err1: any) {
        console.warn(`⚠️ Gemini 3 ni uspel, poskušam alias flash-latest...`, err1.message);
        try {
            usedModel = "gemini-flash-latest";
            trends = await tryGenerate(usedModel);
        } catch (err2: any) {
            console.warn(`⚠️ Alias ni uspel, poskušam še gemini-pro-latest...`);
            try {
                usedModel = "gemini-pro-latest";
                trends = await tryGenerate(usedModel);
            } catch (err3: any) {
                return res.status(500).json({ error: 'AI generation failed', details: err3.message });
            }
        }
    }

    if (Array.isArray(trends) && trends.length > 0) {
        trends = trends
            .map(t => {
                let tag = t.trim();
                if (!tag.startsWith('#')) tag = `#${tag}`;
                return tag; 
            })
            .filter(t => t.length > 3)
            .slice(0, 12);

        const { error: insertError } = await supabase
          .from('trending_ai')
          .insert({ 
              words: trends, 
              updated_at: new Date().toISOString() 
          })
        
        if (insertError) throw insertError
        return res.status(200).json({ success: true, used_model: usedModel, count: trends.length, trends })
    } 

    return res.status(200).json({ success: false, message: 'AI je vrnil prazen rezultat.' })

  } catch (error: any) {
    console.error('Critical Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
