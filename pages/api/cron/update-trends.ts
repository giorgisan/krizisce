/* pages/api/cron/update-trends.ts */
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Varnostni pregled
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Nočni mir (opcijsko, glede na tvoje želje)
  const hour = (new Date().getUTCHours() + 1) % 24; // CET čas
  if (hour >= 23 || hour < 5) {
    return res.status(200).json({ success: true, message: 'Nočni premor.' });
  }

  try {
    // 3. Zajem novic (povečan limit za boljši kontekst)
    const { data: allNews, error } = await supabase
      .from('news')
      .select('title, contentsnippet, source')
      .neq('category', 'oglas')
      .neq('category', 'promo')
      .order('publishedat', { ascending: false })
      .limit(80); // DODANO PODPIČJE

    if (error) throw error
    if (!allNews || allNews.length === 0) {
        return res.status(200).json({ success: false, message: 'Baza je prazna.' })
    }

    // Priprava tekstovnega vnosa
    const headlines = allNews.map(n => `- ${n.source}: ${n.title} ${n.contentsnippet ? `(${n.contentsnippet.substring(0, 100)}...)` : ''}`).join('\n'); // DODANO PODPIČJE

    // 4. SESTAVLJEN PROMPT (Preimenovano v aiPrompt)
    const aiPrompt = `
       Kot izkušen urednik slovenskega novičarskega portala analiziraj spodnji seznam naslovov zadnjih novic.
       Tvoja naloga je dvojna:
       1. Ustvariti seznam trendov (#TemeDneva).
       2. Napisati kratek AI povzetek dogajanja (Brief).

       VHODNI PODATKI:
       ${headlines}

       --- 1. DEL: TRENDI (TAGI) ---
       STRATEGIJA IZBORA:
       1. RELEVANTNOST: Izpostavi teme, o katerih piše več različnih virov.
       2. BREZ PODVAJANJA: Ne ustvarjaj vsebinsko podobnih tagov.
        
       KRITERIJI ZA TAG:
       1. UPORABNOST PRI ISKANJU: Tag mora vsebovati besede iz naslovov.
          - SLABO: #Politično Dogajanje
          - DOBRO: #Golob, #Vojna v Ukrajini
       2. KONKRETNOST: Raje uporabi imena oseb, krajev ali dogodkov.
          - Namesto #Kriminal uporabi #Umor v Mariboru.

       PRAVILA OBLIKOVANJA TAGOV:
       - Vsak tag se mora začeti z lojtro (#).
       - Uporabljaj slovenski jezik in presledke (NE CamelCase).
       - Dolžina: 1 do 3 besede na tag.
       - Besede naj bodo v osnovni obliki (imenovalnik).
       - Ne spreminjaj glagolov v samostalnike, če to spremeni koren.
        
       PREPOVEDANO PRI TAGIH:
       - Izogibaj se generičnim besedam (Šport, Novice, Stanje...).
       - Ne izmišljuj si besed.

       --- 2. DEL: AI BRIEF (POVZETEK) ---
       Napiši kratek, jedrnat povzetek trenutnega dogajanja v Sloveniji in svetu na podlagi zgornjih novic.
       - Dolžina: 2 do 3 stavki (maksimalno 400 znakov).
       - Stil: Objektiven, informativen, tekoč. Kot bi bralec prebral "flash news".
       - Začni z najpomembnejšo novico.
       - Ne naštevaj virov (npr. ne piši "RTV pravi...", ampak samo dejstva).

       --- FORMAT IZHODA (JSON) ---
       Vrni IZKLJUČNO validen JSON objekt (brez markdowna \`\`\`json):
       {
         "trends": ["#Tag1", "#Tag2", ...],
         "summary": "Tukaj napiši besedilo povzetka."
       }
   `;
    
    // Klic AI modela
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview", 
        generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(aiPrompt); // Uporabimo aiPrompt
    const responseText = result.response.text();
    
    // Parsanje
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        // Fallback čiščenje če AI vrne markdown
        const cleanJson = responseText.replace(/```json|```/g, '').trim();
        data = JSON.parse(cleanJson);
    }

    // 5. Shranjevanje v bazo
    if (data && Array.isArray(data.trends)) {
        // Dodatno čiščenje tagov za vsak slučaj
        const cleanTrends = data.trends
            .map((t: string) => t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`)
            .slice(0, 12);

        const { error: insertError } = await supabase
          .from('trending_ai')
          .insert({ 
              words: cleanTrends, 
              summary: data.summary || null, 
              updated_at: new Date().toISOString() 
          });
        
        if (insertError) throw insertError
        
        return res.status(200).json({ success: true, trends: cleanTrends, summary: data.summary })
    }

    return res.status(500).json({ error: 'Invalid AI response structure' })

  } catch (error: any) {
    console.error('AI Cron Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
