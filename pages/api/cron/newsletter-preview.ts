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

// --- SCHEMA DEFINICIJA ---
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
                                text: { type: SchemaType.STRING },
                                story_id: { type: SchemaType.NUMBER }
                            },
                            required: ["theme", "text", "story_id"]
                        }
                    }
                },
                required: ["title", "items"] 
            }
        },
        whats_ahead: { type: SchemaType.STRING },
        closing_line: { type: SchemaType.STRING }
    },
    required: ["intro", "categories", "whats_ahead", "closing_line"]
};

// --- AI VALIDATOR ---
async function validateOutput(aiData: any, promptData: string): Promise<any> {
    const validationPrompt = `
You are a strict fact-checker. Compare OUTPUT against SOURCE.

SOURCE:
${promptData}

OUTPUT:
${JSON.stringify(aiData)}

TASK:
1. Verify that EVERY fact, number, name, and title in the OUTPUT exists explicitly in the SOURCE.
2. Check for "hallucinations": Did the OUTPUT add any titles (like "nekdanji", "predsednik", "minister"), adjectives, specific dates, or statistics that are NOT in the SOURCE? 
   -> EXCEPTION: Temporal words like "danes", "jutri", or "ta konec tedna" are strictly ALLOWED in the 'whats_ahead' section.
3. If you find any hallucinated or altered details, remove them or correct them to match the SOURCE exactly.
4. Do NOT rewrite the text for style, only fix factual additions. Do NOT delete the 'whats_ahead' section unless the event itself is a complete hallucination.
5. Return the corrected OUTPUT as valid JSON matching the exact original structure. If nothing to fix, return OUTPUT unchanged.
`;

    // UPORABA NAJNOVEJŠEGA MODELA ZA VALIDACIJO
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview", // <-- POPRAVLJENO TUKAJ
        generationConfig: { 
            responseMimeType: "application/json",
            responseSchema: newsletterSchema, 
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
    const timeWindow = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
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
                    
                    if (existing) {
                        if (Array.isArray(item.sources)) {
                            item.sources.forEach((s: any) => {
                                const url = typeof s === 'string' ? s : s.url;
                                if (url && !existing.uniqueUrls.has(url)) {
                                    existing.uniqueUrls.add(url);
                                    existing.sources.push(s);
                                }
                            });
                        }
                        
                        existing.score = existing.sources.length || 1;

                        if (!existing.image_url && item.main_image && item.main_image.startsWith('http')) {
                            existing.image_url = item.main_image;
                        }
                    } else {
                        const uniqueUrls = new Set<string>();
                        const cleanSources: any[] = [];
                        
                        if (Array.isArray(item.sources)) {
                            item.sources.forEach((s: any) => {
                                const url = typeof s === 'string' ? s : s.url;
                                if (url && !uniqueUrls.has(url)) {
                                    uniqueUrls.add(url);
                                    cleanSources.push(s);
                                }
                            });
                        }

                        topicMap.set(t, {
                            topic: t,
                            summary: item.summary,
                            image_url: item.main_image && item.main_image.startsWith('http') ? item.main_image : null,
                            sources: cleanSources,
                            uniqueUrls: uniqueUrls, 
                            score: cleanSources.length || 1
                        })
                    }
                })
            }
        })
    }

    // TOP 45 NOVIC ZA VEČJI DOSEG NAPOVEDNIKA
    const topStories = Array.from(topicMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 45);

    if (topStories.length === 0) {
        return res.status(200).json({ message: "Ni podatkov za newsletter." })
    }

    // Fizična ločitev promptData
    let promptData = "=== TOP NOVICE (Obvezno uporabi za 'intro' in 'categories') ===\n\n";
    let bestImage = "";
    
    topStories.forEach((story, index) => {
        if (index === 15) {
            promptData += "=== OSTALE NOVICE (Skeniraj SAMO za 'whats_ahead' in 'closing_line') ===\n\n";
        }
        promptData += `[STORY ID: ${index}]\n- TOPIC: ${story.topic}\n- SUMMARY: ${story.summary}\n\n`;
        
        if (!bestImage && story.image_url && index < 15) {
            bestImage = story.image_url;
        }
    })

    const prompt = `
      You are an elite editor for a premium Slovenian morning news digest called 'Križišče'.
      Your job is to compress the RAW NEWS below into a highly readable, structured daily briefing.
      You have NO other knowledge. If it is not in the RAW NEWS, it does not exist.
      
      RAW NEWS SUMMARIES:
      ${promptData}
      
      YOUR TASK:
      1. 'intro': 2-3 sentences. Conversational, warm "morning anchor" tone. Highlight the most important or surprising story FROM THE TOP NOVICE SECTION with an insightful editorial observation. DO NOT use cliché temporal phrases like "včerajšnji dogodki", "pretekli dan", "današnji dan prinaša" or "odmeva". Jump straight into the narrative. Example style: "Pojasnila policije o dogajanju v Fužinah odpirajo nova vprašanja, medtem ko se na mednarodnem parketu..." Do NOT start with "Dobro jutro", "Danes:" or "Jutro prinaša".
      2. 'categories': Select 3 to 4 dynamic categories. 
         CATEGORIES RULES:
         - ONLY use stories from the '=== TOP NOVICE ===' section (IDs 0 to 14) for these categories. Do not include 'OSTALE NOVICE' here.
         - ALWAYS include "🏔️ Slovenija" FIRST.
         - NEVER create two categories with "Slovenija".
         - Use EXACTLY these icons for other categories if applicable: 🌍 for Svet/Mednarodno, 💰 for Gospodarstvo/Posel, ⚖️ for Kronika, 🏆 for Šport.
         - Provide 2-3 items per category.
      3. Each 'item.theme': 2-4 word punchy label.
      4. Each 'item.text': 1-2 short sentences. Write in an active, present-tense, forward-looking tone (e.g., use phrases like "V ospredju je"). Make it feel like a fresh morning briefing, NOT a historical recap of yesterday. ONLY use facts and numbers that appear verbatim in RAW NEWS.
      5. Each 'item.story_id': EXACTLY the number from the [STORY ID: X] tag that corresponds to this news item!
      6. 'whats_ahead': Scan ALL stories (both TOP NOVICE and OSTALE NOVICE) explicitly for ALL upcoming events, schedules, or announcements (e.g., sports matches happening today/tomorrow, political sessions, price changes). If found, combine EVERY upcoming event you find into a cohesive 2-4 sentence paragraph so the reader is fully prepared for the day. 
         CRITICAL RULE 1: If there are ZERO upcoming events mentioned in ANY section, DO NOT invent any. Return an EXACTLY empty string "".
         CRITICAL RULE 2: DO NOT DUPLICATE. If an upcoming event is already featured as a standalone news item in the 'categories' section above, DO NOT mention it again in 'whats_ahead'. 'whats_ahead' must only contain events that are NOT already covered in the main news.
      7. 'closing_line': 1 sentence highlighting a specific positive, interesting, or notable fact from ANY of the provided stories (TOP or OSTALE) to leave the reader with a final thought.
      
      HARD RULES — ANY VIOLATION MAKES THE OUTPUT INVALID:
      - NUMBERS & STATS: Never write a specific number, percentage, or sequence unless it appears word-for-word in the RAW NEWS.
      - NAMES & TITLES: Copy names exactly as written in the RAW NEWS. Never add titles, roles, or adjectives (nekdanji, aktualni, predsednik...) unless they explicitly exist in the source text.
      - NO SYNTHESIS: Never combine facts from two different stories into one sentence.
      
      OUTPUT LANGUAGE: Formal Slovenian, vikanje.
      `

    const generationConfig = { 
        responseMimeType: "application/json",
        responseSchema: newsletterSchema, 
        temperature: 0.3 
    };

    let aiData;
    try {
        // UPORABA NAJNOVEJŠEGA MODELA
        console.log("🚀 Poskušam najnovejši model: gemini-3-flash-preview...");
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", generationConfig }); // <-- POPRAVLJENO TUKAJ
        const result = await model.generateContent(prompt);
        aiData = JSON.parse(result.response.text());
        console.log("✅ Uspešno uporabljen model: gemini-3-flash-preview");
    } catch (err: any) {
        console.warn("⚠️ 3-flash-preview ni uspel. Fallback na gemini-2.5-flash...");
        try {
            const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig });
            const fallbackResult = await fallbackModel.generateContent(prompt);
            aiData = JSON.parse(fallbackResult.response.text());
            console.log("✅ Uspešno uporabljen model: gemini-2.5-flash");
        } catch (fallbackErr: any) {
            console.error("⚠️ AI napaka:", fallbackErr);
            throw new Error("Napaka pri AI generaciji: " + fallbackErr.message);
        }
    }

    try {
        console.log("🔍 Začenjam AI validacijo imen...");
        aiData = await validateOutput(aiData, promptData);
        console.log("✅ AI validacija uspešno zaključena.");
    } catch (validationErr) {
        console.error("⚠️ Napaka pri AI validaciji, nadaljujem z osnovnimi podatki:", validationErr);
    }

    const todayStr = new Intl.DateTimeFormat('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
    const subjectStr = `Jutranji pregled: ${todayStr} - krizisce.si`
    
    let categoriesHtml = '';

    aiData.categories.forEach((cat: any) => {
        let itemsHtml = '';
        
        cat.items.forEach((item: any) => {
            let sourceLinksHtml = '';
            
            if (item.story_id !== undefined && topStories[item.story_id]) {
                const story = topStories[item.story_id];
                if (story && Array.isArray(story.sources)) {
                    const linkMap = new Map<string, string>(); 
                    
                    story.sources.forEach((s: any) => {
                        const url = typeof s === 'string' ? s : s.url;
                        if (!url) return;
                        
                        try {
                            const hostname = new URL(url).hostname.replace('www.', '');
                            let name = hostname.split('.')[0];
                            name = name.charAt(0).toUpperCase() + name.slice(1);
                            
                            if (hostname.includes('rtvslo')) name = 'RTV SLO';
                            if (hostname.includes('24ur')) name = '24ur';
                            if (hostname.includes('siol')) name = 'Siol';
                            if (hostname.includes('slovenskenovice')) name = 'Slov. novice';
                            if (hostname.includes('delo')) name = 'Delo';
                            if (hostname.includes('dnevnik')) name = 'Dnevnik';
                            if (hostname.includes('zurnal24')) name = 'Žurnal24';
                            if (hostname.includes('n1info')) name = 'N1';
                            if (hostname.includes('svet24')) name = 'Svet24';

                            if (!linkMap.has(name)) {
                                linkMap.set(name, `<a href="${url}" style="color: ${BRAND_COLOR}; text-decoration: none; font-weight: 500;">${name}</a>`);
                            }
                        } catch(e) {}
                    });

                    if (linkMap.size > 0) {
                        const linksArray = Array.from(linkMap.values());
                        sourceLinksHtml = `<div style="margin-top: 4px; font-size: 13px; color: #6B7280; font-family: -apple-system, Arial, sans-serif;">⮑ Beri na: ${linksArray.join(', ')}</div>`;
                    }
                }
            }

            itemsHtml += `
              <div style="margin-bottom: 18px;">
                <p style="font-size: 15px; line-height: 1.6; color: #374151; margin-top: 0; margin-bottom: 0; font-family: -apple-system, Arial, sans-serif;">
                  <strong style="color: #111827;">${item.theme}:</strong> ${item.text}
                </p>
                ${sourceLinksHtml}
              </div>
            `;
        });

        let displayTitle = cat.title;
        const titleMatch = displayTitle.match(/^([^\p{L}\p{N}]+)\s*(.*)$/u);
        if (titleMatch) {
            displayTitle = `${titleMatch[1].trim()}&nbsp; ${titleMatch[2].trim()}`;
        }

        categoriesHtml += `
            <div style="margin-bottom: 30px;">
              <h2 style="font-size: 18px; color: ${BRAND_COLOR}; margin-top: 0; margin-bottom: 14px; font-weight: bold; font-family: Georgia, 'Times New Roman', serif; line-height: 1.3;">
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
                    
                    ${aiData.whats_ahead ? `
                    <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 20px; margin-top: 40px; margin-bottom: 20px;">
                      <h3 style="font-size: 15px; color: #1E3A8A; font-weight: bold; margin-top: 0; margin-bottom: 8px; font-family: -apple-system, Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.05em;">
                        📅 Kaj nas čaka
                      </h3>
                      <p style="font-size: 15px; line-height: 1.6; color: #1E3A8A; margin: 0; font-family: -apple-system, Arial, sans-serif;">
                        ${aiData.whats_ahead}
                      </p>
                    </div>
                    ` : ''}

                    <div style="background-color: #FFF7ED; border-left: 4px solid ${BRAND_COLOR}; padding: 20px; margin-top: ${aiData.whats_ahead ? '20px' : '40px'}; margin-bottom: 40px;">
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
    
    const regenerateUrl = `https://krizisce.si/api/cron/newsletter-preview?key=${process.env.CRON_SECRET}`;
    
    const adminPreviewHtml = finalEmailHtml.replace('{{USER_ID}}', 'test_admin_id');

    const adminEmailHtml = `
      <div style="background-color: #fef08a; padding: 25px; text-align: center; border-bottom: 4px solid #eab308; font-family: sans-serif;">
        <h2 style="margin: 0; color: #854d0e;">👋 Hej, tole je današnji predogled!</h2>
        <p style="color: #a16207; margin-bottom: 20px; font-size: 15px; margin-top: 10px;">Preberi si mail. Če si zadovoljen, pritisni spodnji gumb. Če ti izbor novic ali uvod ni všeč, klikni ponovno generiraj.</p>
        
        <div style="margin-top: 20px;">
          <a href="${adminUrl}" style="background-color: #ea580c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; margin: 5px;">Odobri in pošlji vsem</a>
          
          <a href="${regenerateUrl}" style="background-color: transparent; color: #ea580c; border: 2px solid #ea580c; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; margin: 5px;">Ponovno generiraj ⟳</a>
        </div>
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
