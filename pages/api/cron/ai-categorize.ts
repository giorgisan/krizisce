import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Omogočimo dovolj časa za izvajanje na Vercelu (do 60 sekund)
export const maxDuration = 60; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '');

// Shema, ki prisili AI, da vrne natančen JSON s kategorijami za vsak ID
const categorySchema = {
    type: SchemaType.OBJECT,
    properties: {
        classifications: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    id: { type: SchemaType.NUMBER },
                    category: { 
                        type: SchemaType.STRING,
                        // DODANO: 'oglas' je zdaj veljavna kategorija, ki jo AI lahko potrdi ali spremeni
                        enum: ['slovenija', 'svet', 'kronika', 'sport', 'magazin', 'lifestyle', 'posel-tech', 'moto', 'kultura', 'oglas'] 
                    }
                },
                required: ["id", "category"]
            }
        }
    },
    required: ["classifications"]
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // 1. Varnostno preverjanje (cron secret)
    if (req.query.key !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log("🚀 Začenjam AI kategorizacijo in čiščenje oglasov...");

        // 2. Potegnemo novice, ki še niso bile preverjene z AI.
        // Odstranili smo filter .neq('category', 'oglas'), da AI preveri tudi morebitne napačne oglase.
        const { data: newsItems, error: fetchError } = await supabase
            .from('news')
            .select('id, title, contentsnippet, category, link') // Dodan 'link', da AI vidi URL
            .eq('ai_categorized', false)
            .order('publishedat', { ascending: false })
            .limit(40);

        if (fetchError) throw fetchError;

        if (!newsItems || newsItems.length === 0) {
            return res.status(200).json({ message: "Vse novice so že obdelane." });
        }

        console.log(`Pripravljam ${newsItems.length} novic za AI analizo.`);

        // 3. Priprava podatkov za AI prompt (vključno z URL-jem za detekcijo oglasov)
        let promptData = "";
        newsItems.forEach(item => {
            const cleanTitle = item.title ? item.title.replace(/"/g, "'") : '';
            const cleanSnippet = item.contentsnippet ? item.contentsnippet.substring(0, 150).replace(/"/g, "'") : '';
            promptData += `[ID: ${item.id}]\nURL: ${item.link}\nNASLOV: ${cleanTitle}\nPOVZETEK: ${cleanSnippet}\n---\n`;
        });

        const prompt = `
            You are an expert news editor. Your task is to classify news articles into exactly one category.
            
            CATEGORIES:
            - "slovenija": Domestic politics, regional news, national affairs.
            - "svet": Foreign politics, international events, wars.
            - "kronika": Crime, accidents, police reports, courts, fires.
            - "sport": Sports results, athletes, matches.
            - "posel-tech": Business, economy, stocks, technology, science, AI.
            - "moto": Cars, mobility, traffic, automotive reviews.
            - "magazin": Entertainment, celebrities, movies, music, reality TV, horoscopes.
            - "lifestyle": Food, health, travel, relationships, home.
            - "kultura": Arts, books, theater, exhibitions.
            - "oglas": STRICTLY for paid promotions, advertorials, or self-promotion.
            
            RULES FOR "oglas":
            1. If the URL contains "/promo/", "/advertorial/", "/sponzorirano/", "/dpc-", or "/plačana-objava/", it is an "oglas".
            2. If the content is purely promoting a service, product, or a specific brand without journalistic value, it is an "oglas".
            3. CRITICAL: If an article is a regular news story (even if it is about real estate, quirky topics, or from a magazine section) and the URL is NOT promotional, do NOT tag it as "oglas". Fix misclassified ads.
            
            CRITICAL: Every single article MUST fit into one of the categories. Do NOT use any other category.
            
            ARTICLES TO CLASSIFY:
            ${promptData}
        `;

        // Uporabimo gemini-1.5-flash za stabilnost (ali gemini-2.0-flash, če ga že imaš potrjenega)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash", 
            generationConfig: { 
                responseMimeType: "application/json",
                responseSchema: categorySchema, 
                temperature: 0.1 
            }
        });

        // 4. Klic AI modela
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const aiData = JSON.parse(responseText);

        if (!aiData || !aiData.classifications) {
            throw new Error("Neveljaven odgovor od AI.");
        }

        console.log("✅ AI je uspešno določil nove kategorije.");

        // 5. Posodobitev v bazi
        const updatePromises = aiData.classifications.map((item: any) => {
            return supabase
                .from('news')
                .update({ 
                    category: item.category,
                    ai_categorized: true 
                })
                .eq('id', item.id);
        });

        // Tisti, ki so ostali brez klasifikacije, označimo kot True, da ne obtičijo v zanki
        const processedIds = new Set(aiData.classifications.map((c: any) => c.id));
        const skippedItems = newsItems.filter(item => !processedIds.has(item.id));
        
        skippedItems.forEach(item => {
             updatePromises.push(
                 supabase
                    .from('news')
                    .update({ ai_categorized: true })
                    .eq('id', item.id)
             );
        });

        await Promise.allSettled(updatePromises);

        return res.status(200).json({ 
            success: true, 
            processed: newsItems.length,
            message: `Uspešno obdelanih ${newsItems.length} zapisov.` 
        });

    } catch (e: any) {
        console.error("AI Kategorizacija Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
