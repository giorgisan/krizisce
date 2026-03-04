import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { Resend } from 'resend'

export const maxDuration = 60; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')
const resend = new Resend(process.env.RESEND_API_KEY)

// Bolj nežna, profesionalna "terakota" oranžna barva
const BRAND_COLOR = "#ea580c"; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const timeWindow = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString()
    const { data: analysisRows, error } = await supabase
      .from('media_analysis')
      .select('data')
      .gte('created_at', timeWindow)
      .order('created_at', { ascending: false })

    if (error) throw error

    const topicMap = new Map<string, any>()
    if (analysisRows) {
        analysisRows.forEach(row => {
            let items = [];
            if (typeof row.data === 'string') {
                try { items = JSON.parse(row.data); } catch (e) {}
            } else if (Array.isArray(row.data)) {
                items = row.data;
            }
            if (typeof items === 'string') {
                try { items = JSON.parse(items); } catch (e) {}
            }

            if (Array.isArray(items)) {
                items.forEach(item => {
                    if (!item.topic) return;
                    const t = item.topic;
                    const existing = topicMap.get(t);
                    const sCount = Array.isArray(item.sources) ? item.sources.length : 1;
                    
                    if (existing) {
                        existing.score += sCount;
                        if (!existing.image_url && item.main_image && item.main_image.startsWith('http')) {
                            existing.image_url = item.main_image;
                        }
                    } else {
                        topicMap.set(t, {
                            topic: t,
                            summary: item.summary,
                            image_url: item.main_image && item.main_image.startsWith('http') ? item.main_image : null,
                            score: sCount
                        })
                    }
                })
            }
        })
    }

    // Povečamo na TOP 20, da ima AI res širok spekter novic (od tech do politike)
    const topStories = Array.from(topicMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);

    if (topStories.length === 0) {
        return res.status(200).json({ message: "Ni podatkov za newsletter." })
    }

    let promptData = ""
    let bestImage = "";
    topStories.forEach((story, index) => {
        promptData += `[STORY #${index + 1}]\n- TOPIC: ${story.topic}\n- SUMMARY: ${story.summary}\n\n`;
        if (!bestImage && story.image_url) {
            bestImage = story.image_url;
        }
    })

    const prompt = `
      You are an elite news editor for a premium Slovenian daily digest called 'Križišče'.
      Your goal is to write a highly engaging, analytical, and richly formatted newsletter.
      
      Here are the raw Slovenian stories from the last 30 hours:
      ${promptData}

      YOUR TASK:
      1. 'intro': A warm 2-sentence summary of the general daily vibe. Link the current news to broader global or national contexts.
      2. 'categories': Create exactly 3 to 4 distinct categories (e.g., "🇸🇮 Slovenija: [Smart Subtitle]", "🌍 Svet: [Smart Subtitle]", "💻 Tech & Gospodarstvo: [Smart Subtitle]", "⚽ Šport: [Smart Subtitle]").
      3. For each category, write a 1-sentence 'intro_text' that sets the stage.
      4. For each category, provide 2 to 3 'items'. Each item needs a 'theme' (e.g. "Politični potresi") and a 'text'.
      5. CRITICAL ENRICHMENT: In the 'text', DO NOT just mechanically summarize the raw data. ENRICH the stories with your broader knowledge of current affairs (e.g. mention upcoming elections, inflation, tech shifts, or historical context) to give the reader deep, analytical value.
      6. 'fun_fact': End with a fascinating trivia fact starting with "Ali si vedel, da...". 
      
      STRICT RULE: DO NOT put the fun fact inside the 'categories' array. It belongs ONLY in the 'fun_fact' field.

      Write EVERYTHING in perfect, engaging Slovenian.
    `

    const responseSchema = {
        type: SchemaType.OBJECT,
        properties: {
            intro: { type: SchemaType.STRING },
            categories: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        title: { type: SchemaType.STRING, description: "Npr. '🇸🇮 Slovenija: Predvolilna mrzlica in športni vrhunci'" },
                        intro_text: { type: SchemaType.STRING, description: "1 stavek uvoda v to kategorijo" },
                        items: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    theme: { type: SchemaType.STRING, description: "Kratek poudarek (npr. 'Politični potresi')" },
                                    text: { type: SchemaType.STRING, description: "Bogat odstavek z razlago zgodbe in dodanim širšim kontekstom (2-3 stavki)" }
                                },
                                required: ["theme", "text"]
                            }
                        }
                    },
                    required: ["title", "intro_text", "items"]
                }
            },
            fun_fact: { type: SchemaType.STRING }
        },
        required: ["intro", "categories", "fun_fact"]
    };

    const generationConfig = { 
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.5 
    };

    let aiData;
    try {
        const modelPro = genAI.getGenerativeModel({ model: "gemini-2.5-pro", generationConfig });
        const resultPro = await modelPro.generateContent(prompt);
        aiData = JSON.parse(resultPro.response.text());
    } catch (errPro: any) {
        console.warn("Fallback to 2.5-flash...");
        const modelFlash = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig });
        const resultFlash = await modelFlash.generateContent(prompt);
        aiData = JSON.parse(resultFlash.response.text());
    }

    const todayStr = new Intl.DateTimeFormat('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
    const subjectStr = `[PREDOGLED] Križišče Pregled (${todayStr})`
    
    let categoriesHtml = '';
    // Včasih AI vseeno zapiše zanimivost v kategorije, tukaj to varno prefiltriramo
    const safeCategories = aiData.categories.filter((cat: any) => !cat.title.toLowerCase().includes('zanimivost'));

    safeCategories.forEach((cat: any) => {
        let itemsHtml = '';
        cat.items.forEach((item: any) => {
            itemsHtml += `
              <p style="font-size: 15px; line-height: 1.6; color: #374151; margin-top: 0; margin-bottom: 16px; font-family: -apple-system, Arial, sans-serif;">
                <strong style="color: #111827;">${item.theme}:</strong> ${item.text}
              </p>
            `;
        });

        categoriesHtml += `
            <div style="margin-bottom: 35px;">
              <h2 style="font-size: 20px; color: ${BRAND_COLOR}; margin-top: 0; margin-bottom: 8px; font-weight: bold; font-family: Georgia, 'Times New Roman', serif;">
                ${cat.title}
              </h2>
              <p style="font-size: 15px; line-height: 1.5; color: #4B5563; margin-top: 0; margin-bottom: 20px; font-style: italic; font-family: -apple-system, Arial, sans-serif;">
                ${cat.intro_text}
              </p>
              ${itemsHtml}
            </div>
        `;
    });

    // Popravljen proxy za slike: Odstranjen webp za boljši prikaz v emailih in nastavljena visoka kvaliteta (q=85)
    const proxyImageUrl = bestImage ? `https://images.weserv.nl/?url=${encodeURIComponent(bestImage)}&w=600&q=85&output=jpg` : null;

    const finalEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6; padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; border: 1px solid #E5E7EB; overflow: hidden; margin: 0 auto;">
                
                <tr>
                  <td align="center" style="padding: 35px 20px 25px 20px; border-bottom: 1px solid #E5E7EB; background-color: #ffffff;">
                    <img src="https://krizisce.si/logo.png" alt="Križišče Logo" style="width: 48px; height: 48px; margin-bottom: 16px; display: block;">
                    <h1 style="margin: 0; font-size: 32px; color: #111827; font-family: Georgia, 'Times New Roman', serif; font-weight: normal; letter-spacing: -0.02em;">
                      Križišče <span style="color: ${BRAND_COLOR}; font-weight: bold;">Jutranji pregled</span>
                    </h1>
                    <p style="margin: 10px 0 0 0; font-size: 13px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.1em; font-family: -apple-system, Arial, sans-serif;">
                      ${todayStr}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 40px 24px;">

                    <p style="font-size: 17px; line-height: 1.6; color: #111827; margin-top: 0; margin-bottom: 35px; font-family: -apple-system, Arial, sans-serif;">
                      ${aiData.intro}
                    </p>

                    ${proxyImageUrl ? `
                      <div style="margin-bottom: 35px; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border: 1px solid #f3f4f6;">
                         <img src="${proxyImageUrl}" alt="Poudarek dneva" style="width: 100%; height: auto; display: block;">
                      </div>
                    ` : ''}

                    ${categoriesHtml}

                    <div style="background-color: #FFF7ED; border-left: 4px solid ${BRAND_COLOR}; padding: 20px; margin-bottom: 30px;">
                      <h3 style="font-size: 15px; color: #9A3412; font-weight: bold; margin-top: 0; margin-bottom: 8px; font-family: -apple-system, Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.05em;">
                        🔭 Zanimivost dneva
                      </h3>
                      <p style="font-size: 15px; line-height: 1.6; color: #431407; margin: 0; font-family: -apple-system, Arial, sans-serif;">
                        ${aiData.fun_fact}
                      </p>
                    </div>

                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding: 0 24px 45px 24px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="border-radius: 8px;" bgcolor="${BRAND_COLOR}">
                          <a href="https://krizisce.si" target="_blank" style="font-size: 16px; font-family: -apple-system, Arial, sans-serif; color: #ffffff; text-decoration: none; padding: 16px 36px; display: inline-block; border-radius: 8px; font-weight: bold;">
                            Spremljaj dogajanje v živo
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="background-color: #F9FAFB; padding: 30px 24px; border-top: 1px solid #E5E7EB; font-family: -apple-system, Arial, sans-serif; font-size: 12px; color: #6B7280; line-height: 1.6;">
                    <p style="margin: 0 0 12px 0;">
                      <strong>[PREDOGLED]</strong> To je testni mail. Gumb "Odobri in pošlji" pride v produkciji.
                    </p>
                    <p style="margin: 0 0 12px 0;">
                      Prejeli ste to sporočilo, ker ste prijavljeni na jutranji pregled portala Križišče.si.
                    </p>
                    <p style="margin: 0;">
                      <a href="#" style="color: ${BRAND_COLOR}; text-decoration: underline;">Odjava od obvestil</a> | 
                      <a href="mailto:gjkcme@gmail.com" style="color: ${BRAND_COLOR}; text-decoration: underline;">Kontakt</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const { data: insertedNewsletter, error: insertError } = await supabase
      .from('newsletters')
      .insert({
        subject: subjectStr,
        html_content: finalEmailHtml,
        status: 'draft'
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Križišče <onboarding@resend.dev>',
      to: ['gjkcme@gmail.com'], 
      subject: subjectStr,
      html: finalEmailHtml,
    });

    if (emailError) throw emailError;

    return res.status(200).json({ 
        success: true, 
        message: "Predogled shranjen in poslan!", 
        newsletter_id: insertedNewsletter.id 
    })

  } catch (e: any) {
      console.error("Newsletter Error:", e)
      return res.status(500).json({ error: e.message })
  }
}
