import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import crypto from 'crypto'; 

export const maxDuration = 60; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '');

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

        let promptData = "";
        newsItems.forEach(item => {
            const cleanTitle = item.title ? item.title.replace(/"/g, "'") : '';
            const cleanSnippet = item.contentsnippet ? item.contentsnippet.substring(0, 150).replace(/"/g, "'") : '';
            promptData += `[ID: ${item.id}]\nURL: ${item.link}\nNASLOV: ${cleanTitle}\nPOVZETEK: ${cleanSnippet}\n---\n`;
        });

        // --- POPRAVLJEN IN PAMETNEJŠI PROMPT ZA PREPREČEVANJE LAŽNIH OGLASOV ---
        const prompt = `
            You are an expert news editor. Your task is to classify news articles into exactly one category.
            
            CATEGORIES:
            - "slovenija": Domestic politics, local news, national affairs.
            - "svet": International news, foreign politics, wars (e.g. Ukraine, Gaza), global events.
            - "kronika": Crime, accidents, courts, police, fires, fatalities (domestic OR international).
            - "sport": Sports, matches, athletes, competitions.
            - "posel-tech": Business, economy, companies, PR initiatives, technology, AI, science.
            - "moto": Cars, traffic, vehicles, mobility, car awards.
            - "magazin": Celebrities, entertainment, showbiz, quirky/viral stories, prize games, media self-promotion.
            - "lifestyle": Health, wellness, food, home, relationships, travel.
            - "kultura": Arts, books, theater, exhibitions, movies (art-house).
            - "oglas": STRICTLY for pure external paid commercial ads.
            
            CRITICAL RULES TO AVOID FALSE "oglas":
            1. Viral, funny or quirky stories (e.g., real estate fails, bizarre events) are "magazin", NOT "oglas".
            2. Articles mentioning car brands or car awards (e.g., Renault Clio) are "moto", NOT "oglas".
            3. Corporate PR stories about charity or society (e.g., Coca-Cola helps women) are "posel-tech" or "lifestyle", NOT "oglas".
            4. Media self-promotion or crosswords (e.g., "Berite naš časopis", "Z ugankami do nagrad") are "magazin", NOT "oglas".
            5. ONLY use "oglas" if the article is a blatant paid sales pitch for a product/service AND has zero journalistic value. If the URL contains "/promo/", look at the title - if it's just a crossword or media promo, tag it as "magazin".
            
            CRITICAL: Every single article MUST fit into one of the categories. Do NOT use any other category.
            
            ARTICLES TO CLASSIFY:
            ${promptData}
        `;

        // --- 4. KLIC AI MODELA S FALLBACK LOGIKO ---
        const modelsToTry = [
            "gemini-2.5-flash-lite",           // Primarni, najhitrejši in najcenejši
            "gemini-2.5-flash",                // Prva rezerva
            "gemini-3.1-flash-lite-preview"    // Druga rezerva
        ];

        let aiData = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`🤖 Poskušam klasifikacijo z modelom: ${modelName}...`);
                const model = genAI.getGenerativeModel({ 
                    model: modelName, 
                    generationConfig: { 
                        responseMimeType: "application/json",
                        responseSchema: categorySchema, 
                        temperature: 0.1 
                    }
                });

                const result = await model.generateContent(prompt);
                const parsed = JSON.parse(result.response.text());

                if (parsed && parsed.classifications) {
                    aiData = parsed;
                    console.log(`✅ AI uspešen z modelom: ${modelName}`);
                    break; 
                }
            } catch (err: any) {
                console.warn(`⚠️ Model ${modelName} ni uspel: ${err.message}. Preklapljam na naslednjega...`);
            }
        }

        if (!aiData || !aiData.classifications) {
            throw new Error("❌ Vsi AI modeli so odpovedali ali vrnili neveljaven odgovor.");
        }

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
