import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import crypto from 'crypto'; // Nujno za varno primerjanje ključev

// Omogočimo dovolj časa za izvajanje na Vercelu (do 60 sekund)
export const maxDuration = 60; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '');

// Shema s tipom INTEGER za ID in vsemi kategorijami
const categorySchema = {
    type: SchemaType.OBJECT,
    properties: {
        classifications: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    id: { type: SchemaType.INTEGER },
                    category: { 
                        type: SchemaType.STRING,
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
    // --- 1. VARNOSTNI POPRAVEK: Preprečevanje Timing Attacka ---
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
        console.log("🚀 Začenjam AI kategorizacijo in čiščenje oglasov...");

        // 2. Potegnemo novice (tudi morebitne napačne oglase)
        const { data: newsItems, error: fetchError } = await supabase
            .from('news')
            .select('id, title, contentsnippet, category, link')
            .eq('ai_categorized', false)
            .order('publishedat', { ascending: false })
            .limit(40);

        if (fetchError) throw fetchError;
        if (!newsItems || newsItems.length === 0) {
            return res.status(200).json({ message: "Vse novice so že obdelane." });
        }

        console.log(`Pripravljam ${newsItems.length} novic za AI analizo.`);

        // 3. Priprava podatkov za AI prompt
        let promptData = "";
        newsItems.forEach(item => {
            const cleanTitle = item.title ? item.title.replace(/"/g, "'") : '';
            const cleanSnippet = item.contentsnippet ? item.contentsnippet.substring(0, 150).replace(/"/g, "'") : '';
            promptData += `[ID: ${item.id}]\nURL: ${item.link}\nNASLOV: ${cleanTitle}\nPOVZETEK: ${cleanSnippet}\n---\n`;
        });

        const prompt = `
            You are an expert news editor. Your task is to classify news articles into exactly one category.
            
            CATEGORIES:
            - "slovenija", "svet", "sport", "posel-tech", "moto", "magazin", "lifestyle", "kultura".
            - "kronika": Crime, accidents, police reports, courts, fires.
            - "oglas": STRICTLY for paid promotions, advertorials, or self-promotion.
            
            RULES FOR "oglas":
            1. If the URL contains "/promo/", "/advertorial/", "/sponzorirano/" or "/plačana-objava/", it is an "oglas".
            2. If the content is purely promoting a service, product, or a specific brand without journalistic value, it is an "oglas".
            3. CRITICAL: If an article is a regular news story (even if it is about real estate, quirky topics, or from a magazine section) and the URL is NOT promotional, do NOT tag it as "oglas". Fix misclassified ads.
            
            CRITICAL: Every single article MUST fit into one of the categories. Do NOT use any other category.
            
            ARTICLES TO CLASSIFY:
            ${promptData}
        `;

        // Uporaba izbranega modela gemini-2.5-flash-lite
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash-lite", 
            generationConfig: { 
                responseMimeType: "application/json",
                responseSchema: categorySchema, 
                temperature: 0.1 
            }
        });

        // 4. Klic AI modela
        const result = await model.generateContent(prompt);
        const aiData = JSON.parse(result.response.text());

        if (!aiData || !aiData.classifications) {
            throw new Error("Neveljaven odgovor od AI.");
        }

        console.log("✅ AI je uspešno določil nove kategorije.");

        // 5. Priprava posodobitev v bazi
        const updatePromises = aiData.classifications.map((item: any) => {
            return supabase
                .from('news')
                .update({ 
                    category: item.category,
                    ai_categorized: true 
                })
                .eq('id', Number(item.id));
        });

        const processedIds = new Set(aiData.classifications.map((c: any) => Number(c.id)));
        const skippedItems = newsItems.filter(item => !processedIds.has(Number(item.id)));
        
        skippedItems.forEach(item => {
             updatePromises.push(
                 supabase.from('news').update({ ai_categorized: true }).eq('id', Number(item.id))
             );
        });

        // --- ROBUSTNOST: Logiranje napak pri posodabljanju ---
        const results = await Promise.allSettled(updatePromises);
        const failed = results.filter(r => r.status === 'rejected');
        
        if (failed.length > 0) {
            console.error(`${failed.length} posodobitev je spodletelo.`, failed);
        }

        return res.status(200).json({ 
            success: true, 
            processed: newsItems.length,
            failed: failed.length,
            message: `Uspešno obdelanih ${newsItems.length} zapisov.` 
        });

    } catch (e: any) {
        console.error("AI Kategorizacija Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
