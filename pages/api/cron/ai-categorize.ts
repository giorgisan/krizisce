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

    try {
        console.log("🚀 Začenjam izboljšano AI kategorizacijo...");

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

        let promptData = "";
        newsItems.forEach(item => {
            const cleanTitle = item.title ? item.title.replace(/"/g, "'") : '';
            const cleanSnippet = item.contentsnippet ? item.contentsnippet.substring(0, 160).replace(/"/g, "'") : '';
            promptData += `[ID: ${item.id}]\nURL: ${item.link}\nNASLOV: ${cleanTitle}\nPOVZETEK: ${cleanSnippet}\n---\n`;
        });

        const prompt = `
            You are an expert news editor. Your task is to classify news articles into exactly one category.
            
            CATEGORIES:
            - "slovenija": Domestic politics, local news, national affairs.
            - "svet": International news, foreign politics, wars, global events.
            - "kronika": Crime, accidents, courts, police, fires.
            - "sport": Sports, matches, athletes.
            - "posel-tech": Business, economy, companies, technology, science.
            - "moto": Cars, traffic, vehicles.
            - "magazin": Celebrities, entertainment, showbiz, quirky stories, prize games, viral trends.
            - "lifestyle": Health, wellness, food, home, relationships, travel.
            - "kultura": Arts, books, theater, movies.
            - "oglas": STRICTLY for pure paid commercial advertisements (sales pitches).
            
            CRITICAL RULES TO PREVENT FALSE "oglas" CLASSIFICATION:
            1. **Journalism ABOUT Ads**: If an article is a story ABOUT an advertisement (e.g., "Woman finds her face in an ad", "Remake of a cult TV ad"), it is "magazin", NOT "oglas".
            2. **Media Self-Promotion**: Prize games, crosswords, and invitations to read a newspaper (e.g., "Z ugankami do nagrad", "Odkrijte Dnevnik") are "magazin", NOT "oglas".
            3. **Native Content / Advice**: Articles giving general advice (e.g., "How to appeal a decision", "Costs of owning an apartment") are "lifestyle" or "posel-tech", even if they look like sponsored content, UNLESS they are 100% selling a specific product.
            4. **URL check**: Do not ignore articles just because the URL contains "/promo/" or "/oglas/". Check the content. If it has any viral or journalistic value, use a content category.
            5. **Blatant Ads**: Only use "oglas" for direct sales: "Buy this Office key for 30€", "Get 20% discount on these windows", "Promotion of a specific hotel package".
            
            ARTICLES TO CLASSIFY:
            ${promptData}
        `;

        // Posodobljeni modeli glede na tvoje limite (2.5 Pro in Flash imata visoke limite)
        const modelsToTry = [
            "gemini-2.0-flash", 
            "gemini-2.5-flash",
            "gemini-2.5-pro"
        ];

        let aiData = null;
        for (const modelName of modelsToTry) {
            try {
                console.log(`🤖 Poskušam model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ 
                    model: modelName, 
                    generationConfig: { 
                        responseMimeType: "application/json",
                        responseSchema: categorySchema, 
                        temperature: 0.1 
                    }
                });

                const result = await model.generateContent(prompt);
                aiData = JSON.parse(result.response.text());

                if (aiData?.classifications) break; 
            } catch (err: any) {
                console.warn(`⚠️ Model ${modelName} ni uspel.`);
            }
        }

        if (!aiData?.classifications) throw new Error("Vsi modeli so odpovedali.");

        const updatePromises = aiData.classifications.map((item: any) => {
            return supabase
                .from('news')
                .update({ category: item.category, ai_categorized: true })
                .eq('id', Number(item.id));
        });

        // Označi vse poslane ID-je kot obdelane, tudi če jih AI ni klasificiral
        const processedIds = new Set(aiData.classifications.map((c: any) => Number(c.id)));
        newsItems.forEach(item => {
            if (!processedIds.has(item.id)) {
                updatePromises.push(supabase.from('news').update({ ai_categorized: true }).eq('id', item.id));
            }
        });

        await Promise.allSettled(updatePromises);

        return res.status(200).json({ 
            success: true, 
            processed: newsItems.length,
            message: `Klasifikacija zaključena.` 
        });

    } catch (e: any) {
        console.error("AI Kategorizacija Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
