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

    // SPREMEMBA: Bistveno izboljšan in robusten prompt za 'Imena' brez hardkodiranja
    const prompt = `
      You are an elite, highly rigorous news editor for a premium Slovenian daily morning digest called 'Križišče'.
      Your goal is to write a highly engaging, analytical, and richly formatted morning newsletter.
      
      Here are the raw Slovenian stories from the last 30 hours:
      ${promptData}

      YOUR TASK:
      1. 'intro': A warm 1-2 sentence morning summary setting the vibe for TODAY. (Do NOT include "Dobro jutro", just start the summary).
      2. 'categories': Create 3 to 4 distinct categories based on the news (e.g., "🇸🇮 Slovenija: [Subtitle]", "🌍 Svet: [Subtitle]", "💻 Tech: [Subtitle]", etc.).
      3. For each category, write a 1-sentence 'intro_text'.
      4. For each category, provide 2 to 3 'items'. Each item needs a 'theme' (e.g. "Politični potresi") and a 'text' (2-3 sentences).
      5. MORNING BRIEFING TONE: Frame the stories for today's context. If the provided data mentions an ongoing event or something scheduled for today, highlight it as an upcoming/ongoing event.
      6. 'fun_fact': End with a fascinating trivia fact starting with "Ali ste vedeli, da...". 
      
     CRITICAL RULES FOR FACTUAL ACCURACY AND NAMING (ZERO-INFERENCE FACT GROUNDING):
      - DO NOT make up, invent, or predict outcomes.
      - Treat every proper noun (name of a person, organization, country) exactly as an immutable, literal string as it appears in the provided SUMMARY text.
      - ABSOLUTE PROHIBITION: You must NOT prepend any title, status, temporal adjective (such as "nekdanji", "bivši", "trenutni"), or professional designation (such as "predsednik", "premier", "minister") to a person's name UNLESS that exact word is present in the raw text for that specific person.
      - If the source text says "Donald Trump", you must output exactly "Donald Trump" without any prefix or suffix.
      - Do not infer a person's status from your internal knowledge. Only output what is provided in the text.
      
      FORMATTING RULES: 
      - ALWAYS put the '🇸🇮 Slovenija' category FIRST in the array!
      - DO NOT put the fun fact inside the 'categories' array. It belongs ONLY in the 'fun_fact' field.
      - The entire text MUST use the formal Slovenian plural 'vikanje'.

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
                        title: { type: SchemaType.STRING },
                        intro_text: { type: SchemaType.STRING },
                        items: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    theme: { type: SchemaType.STRING },
                                    text: { type: SchemaType.STRING }
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
        temperature: 0.4 
    };

    let aiData;
    try {
        console.log("🚀 Poskušam stabilen model: gemini-2.5-pro...");
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro", generationConfig });
        const result = await model.generateContent(prompt);
        aiData = JSON.parse(result.response.text());
        console.log("✅ Uspešno uporabljen model: gemini-2.5-pro");
    } catch (err: any) {
        console.warn("⚠️ 2.5-pro ni uspel. Fallback na gemini-2.0-flash...");
        try {
            const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig });
            const fallbackResult = await fallbackModel.generateContent(prompt);
            aiData = JSON.parse(fallbackResult.response.text());
            console.log("✅ Uspešno uporabljen model: gemini-2.0-flash");
        } catch (fallbackErr: any) {
            console.error("⚠️ AI napaka:", fallbackErr);
            throw new Error("Napaka pri AI generaciji: " + fallbackErr.message);
        }
    }

    const todayStr = new Intl.DateTimeFormat('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
    const subjectStr = `Križišče Pregled: ${todayStr}`
    
    let categoriesHtml = '';
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

    let finalImageUrl = bestImage;
    if (finalImageUrl) {
        finalImageUrl = finalImageUrl.replace('/213xX/', '/1200xX/');
        finalImageUrl = finalImageUrl.replace('/600xX/', '/1200xX/');
    }
    const proxyImageUrl = finalImageUrl ? `https://images.weserv.nl/?url=${encodeURIComponent(finalImageUrl)}&w=800&q=100&output=jpg` : null;

    // SPREMEMBA: Dodani "Ghost Tables" in DPI fix za OUTLOOK
    const finalEmailHtml = `
      <!DOCTYPE html>
      <html lang="sl">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
      <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6;">
          <tr>
            <td align="center" style="padding: 20px 10px;">
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; border: 1px solid #E5E7EB; margin: 0 auto;">
                
                <tr>
                  <td align="center" style="padding: 35px 20px 25px 20px; border-bottom: 1px solid #E5E7EB; background-color: #ffffff; border-radius: 8px 8px 0 0;">
                    <img src="https://krizisce.si/logo.png" alt="Križišče Logo" width="52" style="width: 52px; height: auto; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;">
                    <h1 style="margin: 0 0 6px 0; font-size: 32px; color: #111827; font-family: Georgia, 'Times New Roman', serif; font-weight: bold; letter-spacing: -0.02em; line-height: 1; text-align: center;">
                      Križišče
                    </h1>
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: ${BRAND_COLOR}; text-transform: uppercase; letter-spacing: 0.15em; font-family: -apple-system, Arial, sans-serif; font-weight: bold; text-align: center;">
                      Jutranji pregled
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #6B7280; font-family: -apple-system, Arial, sans-serif; text-align: center;">
                      ${todayStr}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 40px 24px;">

                    <p style="font-size: 18px; line-height: 1.6; color: #111827; margin-top: 0; margin-bottom: 10px; font-family: -apple-system, Arial, sans-serif; font-weight: bold;">
                      Dobro jutro! ☕
                    </p>
                    <p style="font-size: 17px; line-height: 1.6; color: #111827; margin-top: 0; margin-bottom: 35px; font-family: -apple-system, Arial, sans-serif;">
                      ${aiData.intro}
                    </p>

                    ${proxyImageUrl ? `
                      <div style="margin-bottom: 35px; text-align: center;">
                         <img src="${proxyImageUrl}" alt="Poudarek dneva" width="550" style="width: 100%; max-width: 550px; height: auto; display: block; margin: 0 auto; border-radius: 8px; border: 1px solid #f3f4f6;">
                      </div>
                    ` : ''}

                    ${categoriesHtml}

                    <div style="background-color: #FFF7ED; border-left: 4px solid ${BRAND_COLOR}; padding: 20px; margin-bottom: 40px;">
                      <h3 style="font-size: 15px; color: #9A3412; font-weight: bold; margin-top: 0; margin-bottom: 8px; font-family: -apple-system, Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.05em;">
                        🔭 Zanimivost dneva
                      </h3>
                      <p style="font-size: 15px; line-height: 1.6; color: #431407; margin: 0; font-family: -apple-system, Arial, sans-serif;">
                        ${aiData.fun_fact}
                      </p>
                    </div>

                    <p style="font-size: 16px; line-height: 1.6; color: #374151; font-style: italic; text-align: center; margin-top: 0; margin-bottom: 25px; font-family: Georgia, 'Times New Roman', serif;">
                      Hvala, ker nas berete.
                    </p>

                    <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="border-radius: 8px;" bgcolor="${BRAND_COLOR}">
                          <a href="https://krizisce.si" target="_blank" style="font-size: 16px; font-family: -apple-system, Arial, sans-serif; color: #ffffff; text-decoration: none; padding: 16px 36px; display: inline-block; border-radius: 8px; font-weight: bold;">
                            Obiščite krizisce.si
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <tr>
                  <td align="center" style="background-color: #F9FAFB; padding: 35px 24px; border-top: 1px solid #E5E7EB; border-radius: 0 0 8px 8px; font-family: -apple-system, Arial, sans-serif; font-size: 12px; color: #6B7280; line-height: 1.6;">
                    
                    <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; margin-bottom: 24px; text-align: center;">
                      <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                        <strong>Transparentnost:</strong> Ta pregled je ustvarjen s pomočjo naprednih modelov umetne inteligence na podlagi javno dostopnih novic slovenskih medijev. Za podrobnosti obiščite in podprite slovenske medije.
                      </p>
                    </div>

                    <p style="margin: 0 0 10px 0; font-size: 11px;">
                      To sporočilo ste prejeli, ker ste se prijavili na brezplačni pregled novic. Če naših obvestil ne želite več prejemati, se lahko odjavite s klikom na spodnjo povezavo.
                    </p>
                    
                    <p style="margin: 0 0 25px 0;">
                      <a href="https://krizisce.si/api/unsubscribe?id={{USER_ID}}" style="color: #9ca3af; text-decoration: underline; font-size: 11px;">Odjavi me od e-novic</a>
                    </p>

                    <p style="margin: 0; font-size: 11px; color: #d1d5db; font-weight: 500;">
                      &copy; 2026 Križišče – Vse pravice pridržane.
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

    const adminUrl = `https://krizisce.si/api/cron/send-newsletter?id=${insertedNewsletter.id}&key=${process.env.CRON_SECRET}`;
    
    // Za Tvoj osebni predogled zamenjamo string s tvojim mailom (varno odjavljanje deluje!)
    const adminPreviewHtml = finalEmailHtml.replace('{{USER_ID}}', 'test_admin_id');

    const adminEmailHtml = `
      <div style="background-color: #fef08a; padding: 25px; text-align: center; border-bottom: 4px solid #eab308; font-family: sans-serif;">
        <h2 style="margin-top: 0; color: #854d0e;">👋 Hej, tole je današnji predogled!</h2>
        <p style="color: #a16207; margin-bottom: 20px; font-size: 15px;">Preberi si mail. Če si zadovoljen, pritisni spodnji gumb in sistem bo mail poslal vsem naročnikom na Križišče.</p>
        <a href="${adminUrl}" style="background-color: #ea580c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Odobri in pošlji vsem</a>
      </div>
      ${adminPreviewHtml}
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Križišče <jutro@krizisce.si>', 
      replyTo: 'gjkcme@gmail.com',         
      to: ['gjkcme@gmail.com'], 
      subject: `[PREDOGLED] ${subjectStr}`,
      html: adminEmailHtml, 
    });

    if (emailError) throw emailError;

    return res.status(200).json({ 
        success: true, 
        message: "Predogled shranjen in poslan tebi v potrditev!", 
        newsletter_id: insertedNewsletter.id 
    })

  } catch (e: any) {
      console.error("Newsletter Error:", e)
      return res.status(500).json({ error: e.message })
  }
}
