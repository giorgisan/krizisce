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
                        // Tukaj so natančno definirane dovoljene kategorije, ki ustrezajo tvojemu sistemu
                        enum: ['slovenija', 'svet', 'kronika', 'sport', 'magazin', 'lifestyle', 'posel-tech', 'moto', 'kultura'] 
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
        console.log("🚀 Začenjam AI kategorizacijo...");

        // 2. Potegnemo novice, ki še niso bile preverjene z AI, in niso oglasi
        // Limit je 40, da ne presežemo omejitev tokenov v enem klicu
        const { data: newsItems, error: fetchError } = await supabase
            .from('news')
            .select('id, title, contentsnippet, category')
            .eq('ai_categorized', false)
            .neq('category', 'oglas')
            .order('publishedat', { ascending: false })
            .limit(40);

        if (fetchError) throw fetchError;

        if (!newsItems || newsItems.length === 0) {
            return res.status(200).json({ message: "Vse novice so že kategorizirane." });
        }

        console.log(`Pripravljam ${newsItems.length} novic za AI analizo.`);

        // 3. Priprava podatkov za AI prompt
        let promptData = "Poveži vsak ID z najbolj primerno kategorijo. Bodi zelo natančen.\n\n";
        newsItems.forEach(item => {
            const cleanTitle = item.title ? item.title.replace(/"/g, "'") : '';
            const cleanSnippet = item.contentsnippet ? item.contentsnippet.substring(0, 150).replace(/"/g, "'") : '';
            promptData += `[ID: ${item.id}]\nNASLOV: ${cleanTitle}\nPOVZETEK: ${cleanSnippet}\n---\n`;
        });

        const prompt = `
            You are an expert news editor for a Slovenian news aggregator.
            Your task is to classify news articles into one of the exact predefined categories.
            
            RULES:
            - "slovenija": Domestic politics, local news, national affairs.
            - "svet": International news, foreign politics, wars (e.g. Ukraine, Gaza), global events.
            - "kronika": Crime, accidents, courts, police, fires, fatalities (domestic OR international).
            - "sport": Sports, matches, athletes, competitions.
            - "posel-tech": Business, economy, companies, stock market, technology, AI, science.
            - "moto": Cars, traffic, vehicles, mobility.
            - "magazin": Celebrities, entertainment, showbiz, royalty, horoscopes, reality TV.
            - "lifestyle": Health, wellness, food, home, relationships, travel.
            - "kultura": Arts, books, theater, exhibitions, movies (art-house).
            CRITICAL: Every single article MUST fit into one of the above 9 categories. Find the best possible fit based on the primary subject, even if it spans multiple topics. Do NOT use any other category.
            
            ARTICLES TO CLASSIFY:
            ${promptData}
        `;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash", 
            generationConfig: { 
                responseMimeType: "application/json",
                responseSchema: categorySchema, 
                temperature: 0.1 // Zelo nizka temperatura za maksimalno determiniranost
            }
        });

        // 4. Klic AI modela
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const aiData = JSON.parse(responseText);

        if (!aiData || !aiData.classifications) {
            throw new Error("Neveljaven odgovor od AI.");
        }

        console.log("✅ AI je uspešno vrnil kategorije.");

        // 5. Priprava podatkov za masovno posodobitev v Supabase
        const classifications = aiData.classifications;
        
        // Supabase nima direktne bulk update funkcije z različnimi vrednostmi, 
        // zato lahko uporabimo upsert ali posamezne update (ker imamo < 40 vrstic, je Promise.all čisto ok).
        const updatePromises = classifications.map((item: any) => {
            return supabase
                .from('news')
                .update({ 
                    category: item.category,
                    ai_categorized: true 
                })
                .eq('id', item.id);
        });

        // Tisti, ki jih je AI morda ignoriral (zaradi napake), označimo, da se ne bodo ponavljali v neskončnost
        const processedIds = new Set(classifications.map((c: any) => c.id));
        const skippedItems = newsItems.filter(item => !processedIds.has(item.id));
        
        skippedItems.forEach(item => {
             updatePromises.push(
                 supabase
                    .from('news')
                    .update({ ai_categorized: true })
                    .eq('id', item.id)
             );
        });

        const results = await Promise.allSettled(updatePromises);
        
        const errors = results.filter(r => r.status === 'rejected');
        if (errors.length > 0) {
            console.error(`Opozorilo: Ni uspelo posodobiti ${errors.length} vrstic.`);
        }

        return res.status(200).json({ 
            success: true, 
            processed: newsItems.length,
            message: `Uspešno kategoriziranih ${newsItems.length} novic.` 
        });

    } catch (e: any) {
        console.error("AI Kategorizacija Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
