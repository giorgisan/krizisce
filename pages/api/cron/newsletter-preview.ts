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

// --- SCHEMA DEFINICIJA (PREMAKNJENA NA VRH) ---
const newsletterSchema = {
    type: SchemaType.OBJECT,
    properties: {
        intro: { type: SchemaType.STRING },
        categories: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    title: { type: SchemaType.STRING },
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
                required: ["title", "items"] 
            }
        },
        closing_line: { type: SchemaType.STRING }
    },
    required: ["intro", "categories", "closing_line"]
};

// --- NOVA FUNKCIJA: AI VALIDATOR ---
async function validateOutput(aiData: any, promptData: string): Promise<any> {
    const validationPrompt = `
You are a fact-checker. Compare OUTPUT against SOURCE.

SOURCE:
${promptData}

OUTPUT:
${JSON.stringify(aiData)}

TASK: Find every proper noun (person's name) in OUTPUT.
For each name, check: does the OUTPUT add any title, role, or adjective 
(like "nekdanji", "predsednik", "premier", "minister", "general"...) 
that does NOT appear next to that name in SOURCE?

If yes: remove the addition, keep only the name as it appears in SOURCE.
Return the corrected OUTPUT as valid JSON matching the exact original structure. If nothing to fix, return OUTPUT unchanged.
`;

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        generationConfig: { 
            responseMimeType: "application/json",
            responseSchema: newsletterSchema, // <-- UPORABLJA ISTO SHEMO
            temperature: 0 
        }
    });
    
    const result = await model.generateContent(validationPrompt);
    return JSON.parse(result.response.text());
}
// -----------------------------------

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

    // SPREMEMBA: Dinamične kategorije, stroge ikone, uredniški "kava" uvod.
    const prompt = `
      You are an elite editor for a premium Slovenian morning news digest called 'Križišče'.
      Your job is to compress the RAW NEWS below into a highly readable, structured daily briefing.
      You have NO other knowledge. If it is not in the RAW NEWS, it does not exist.
      
      RAW NEWS SUMMARIES:
      ${promptData}
      
      YOUR TASK:
      1. 'intro': 2-3 sentences. Conversational, warm but informed "journalist having morning coffee" tone. Highlight the most surprising or important story with one editorial observation. NOT a dry list. Example style: "Danes zjutraj dominira Iran — a zgodba o Matavžu pove več o nas kot o vojni." Do NOT start with "Dobro jutro" or "Danes:".
      2. 'categories': Select 3 to 4 dynamic categories based on the day's news. 
         CATEGORIES RULES:
         - ALWAYS include "🇸🇮 Slovenija" FIRST.
         - NEVER create two categories with "Slovenija" — merge all domestic news into one.
         - Use EXACTLY these icons for other categories if applicable: 🌍 for Svet/Mednarodno, 💰 for Gospodarstvo/Posel, ⚖️ for Kronika, 🏆 for Šport.
         - Provide 2-3 items per category.
      3. Each 'item.theme': 2-4 word punchy label.
      4. Each 'item.text': 1-2 short sentences. ONLY facts and numbers that appear verbatim in RAW NEWS.
      5. 'closing_line': 1 sentence highlighting a specific positive, interesting, or notable fact from the RAW NEWS to leave the reader with a final thought.
      
      HARD RULES — ANY VIOLATION MAKES THE OUTPUT INVALID:
      - NUMBERS & STATS: Never write a specific number, percentage, or sequence unless it appears word-for-word in the RAW NEWS.
      - NAMES & TITLES: Copy names exactly as written in the RAW NEWS. Never add titles, roles, or adjectives (nekdanji, aktualni, predsednik...) unless they explicitly exist in the source text.
      - NO SYNTHESIS: Never combine facts from two different stories into one sentence.
      - NO PADDING: Never write redundant phrases.
      
      OUTPUT LANGUAGE: Formal Slovenian, vikanje.
      `

    const generationConfig = { 
        responseMimeType: "application/json",
        responseSchema: newsletterSchema, 
        temperature: 0.3 // Malenkost višja temperatura za boljšo kreativnost pri uvodu (editorial tone)
    };

    let aiData;
    try {
        console.log("🚀 Poskušam hiter model: gemini-2.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig });
        const result = await model.generateContent(prompt);
        aiData = JSON.parse(result.response.text());
        console.log("✅ Uspešno uporabljen model: gemini-2.5-flash");
    } catch (err: any) {
        console.warn("⚠️ 2.5-flash ni uspel. Fallback na gemini-2.0-flash...");
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

    // --- IZVEDBA AI VALIDACIJE ---
    try {
        console.log("🔍 Začenjam AI validacijo imen...");
        aiData = await validateOutput(aiData, promptData);
        console.log("✅ AI validacija uspešno zaključena.");
    } catch (validationErr) {
        console.error("⚠️ Napaka pri AI validaciji, nadaljujem z osnovnimi podatki:", validationErr);
    }
    // -----------------------------------

    const todayStr = new Intl.DateTimeFormat('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
    const subjectStr = `Jutranji pregled: ${todayStr} - krizisce.si`
    
    let categoriesHtml = '';

    aiData.categories.forEach((cat: any) => {
        let itemsHtml = '';
        cat.items.forEach((item: any) => {
            itemsHtml += `
              <p style="font-size: 15px; line-height: 1.6; color: #374151; margin-top: 0; margin-bottom: 12px; font-family: -apple-system, Arial, sans-serif;">
                <strong style="color: #111827;">${item.theme}:</strong> ${item.text}
              </p>
            `;
        });

        // NOVO: Trik za Outlook. Če naslov vsebuje 🇸🇮, ga zavijemo v "skrij pred Outlookom" kodo.
        let displayTitle = cat.title;
        if (displayTitle.includes('🇸🇮')) {
            displayTitle = displayTitle.replace('🇸🇮', '🇸🇮');
        }

        categoriesHtml += `
            <div style="margin-bottom: 30px;">
              <h2 style="font-size: 18px; color: ${BRAND_COLOR}; margin-top: 0; margin-bottom: 12px; font-weight: bold; font-family: Georgia, 'Times New Roman', serif;">
                ${displayTitle}
              </h2>
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
                    <p style="font-size: 16px; line-height: 1.6; color: #111827; margin-top: 0; margin-bottom: 30px; font-family: -apple-system, Arial, sans-serif;">
                      ${aiData.intro}
                    </p>

                    ${proxyImageUrl ? `
                      <div style="margin-bottom: 35px; text-align: center;">
                         <img src="${proxyImageUrl}" alt="Poudarek dneva" width="550" style="width: 100%; max-width: 550px; height: auto; display: block; margin: 0 auto; border-radius: 8px; border: 1px solid #f3f4f6;">
                      </div>
                    ` : ''}

                    ${categoriesHtml}

                    <div style="background-color: #FFF7ED; border-left: 4px solid ${BRAND_COLOR}; padding: 20px; margin-top: 40px; margin-bottom: 40px;">
                      <h3 style="font-size: 15px; color: #9A3412; font-weight: bold; margin-top: 0; margin-bottom: 8px; font-family: -apple-system, Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.05em;">
                        💡 Za konec
                      </h3>
                      <p style="font-size: 15px; line-height: 1.6; color: #431407; margin: 0; font-family: -apple-system, Arial, sans-serif;">
                        ${aiData.closing_line}
                      </p>
                    </div>

                    <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 30px auto 20px auto;">
                      <tr>
                        <td align="center" style="border-radius: 8px;" bgcolor="${BRAND_COLOR}">
                          <a href="https://krizisce.si" target="_blank" style="font-size: 16px; font-family: -apple-system, Arial, sans-serif; color: #ffffff; text-decoration: none; padding: 16px 36px; display: inline-block; border-radius: 8px; font-weight: bold;">
                            Preberite več na krizisce.si
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
