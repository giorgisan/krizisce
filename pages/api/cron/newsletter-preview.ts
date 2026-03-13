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
                                story_ids: { 
                                    type: SchemaType.ARRAY,
                                    items: { type: SchemaType.NUMBER }
                                }
                            },
                            required: ["theme", "text", "story_ids"]
                        }
                    }
                },
                required: ["title", "items"] 
            }
        },
        quote_of_the_day: { 
            type: SchemaType.OBJECT,
            properties: {
                quote: { type: SchemaType.STRING },
                author: { type: SchemaType.STRING },
                story_id: { type: SchemaType.NUMBER } 
            },
            required: ["quote", "author", "story_id"]
        },
        number_of_the_day: {
            type: SchemaType.OBJECT,
            properties: {
                number: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING }
            },
            required: ["number", "description"]
        }
    },
    required: ["intro", "categories", "quote_of_the_day"]
};

// --- AI VALIDATOR ---
async function validateOutput(aiData: any, promptData: string, currentDayStr: string): Promise<any> {
    const validationPrompt = `
You are a strict fact-checker and editor. Compare OUTPUT against SOURCE.

CRITICAL TEMPORAL CONTEXT:
Today is exactly ${currentDayStr} (Morning).

SOURCE:
${promptData}

OUTPUT:
${JSON.stringify(aiData)}

TASK:
1. Verify that EVERY fact, number, name, location, and title in the OUTPUT exists explicitly in the SOURCE.
2. PAY SPECIAL ATTENTION TO 'ORIGINAL TITLES' in the source. They are the ultimate ground truth.
3. Check for "hallucinations".
4. TEMPORAL CHECK: Ensure temporal references are correct relative to TODAY (${currentDayStr}).
5. RELEVANCE & OUTDATED NEWS: Rewrite or REMOVE items detailing minor temporary states from yesterday that are no longer relevant today.
6. QUOTE & NUMBER CHECK (CRITICAL): 
   - Verify that the 'quote_of_the_day' is an EXACT word-for-word match from the SOURCE text. If the quote is fabricated, paraphrased, or not present in the text, you MUST replace it with a real quote from the text, or completely remove the 'quote_of_the_day' object.
   - Verify 'number_of_the_day' exists in the text. If fabricated, remove the 'number_of_the_day' object.
7. Return the corrected OUTPUT as valid JSON matching the exact original structure.
`;

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
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

    const mergedTopics: any[] = [];
    const urlToTopicIndex = new Map<string, number>();

    const normalizeUrl = (u: string) => {
        if (!u) return '';
        try {
            const parsed = new URL(u);
            return parsed.hostname.replace('www.', '') + parsed.pathname.replace(/\/$/, '');
        } catch(e) {
            return u.split('?')[0].replace(/\/$/, '');
        }
    };

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
                    if (!item.topic || !Array.isArray(item.sources)) return;

                    const currentSources = item.sources.filter((s: any) => {
                        const u = typeof s === 'string' ? s : s.url;
                        return !!u;
                    });
                    
                    if (currentSources.length === 0) return;

                    let targetIndex = -1;
                    
                    for (const s of currentSources) {
                        const rawUrl = typeof s === 'string' ? s : s.url;
                        const url = normalizeUrl(rawUrl);
                        if (urlToTopicIndex.has(url)) {
                            targetIndex = urlToTopicIndex.get(url)!;
                            break;
                        }
                    }

                    if (targetIndex !== -1) {
                        const existing = mergedTopics[targetIndex];
                        currentSources.forEach((s: any) => {
                            const rawUrl = typeof s === 'string' ? s : s.url;
                            const url = normalizeUrl(rawUrl);
                            if (!existing.uniqueUrls.has(url)) {
                                existing.uniqueUrls.add(url);
                                existing.sources.push(s); 
                                urlToTopicIndex.set(url, targetIndex); 
                            }
                        });
                        existing.score = existing.sources.length;

                        if (item.summary.length > existing.summary.length) {
                             existing.summary = item.summary;
                        }

                        if (!existing.image_url && item.main_image && item.main_image.startsWith('http')) {
                            existing.image_url = item.main_image;
                        }
                    } else {
                        const newIndex = mergedTopics.length;
                        const uniqueUrls = new Set<string>();
                        const cleanSources: any[] = [];
                        
                        currentSources.forEach((s: any) => {
                            const rawUrl = typeof s === 'string' ? s : s.url;
                            const url = normalizeUrl(rawUrl);
                            if (!uniqueUrls.has(url)) {
                                uniqueUrls.add(url);
                                cleanSources.push(s);
                                urlToTopicIndex.set(url, newIndex); 
                            }
                        });

                        mergedTopics.push({
                            topic: item.topic,
                            summary: item.summary,
                            image_url: item.main_image && item.main_image.startsWith('http') ? item.main_image : null,
                            sources: cleanSources,
                            uniqueUrls: uniqueUrls, 
                            score: cleanSources.length
                        });
                    }
                })
            }
        })
    }

    const topStories = mergedTopics
        .sort((a, b) => b.score - a.score)
        .slice(0, 30);

    if (topStories.length === 0) {
        return res.status(200).json({ message: "Ni podatkov za newsletter." })
    }

    let promptData = "=== TOP NOVICE (Obvezno uporabi za 'intro' in 'categories') ===\n\n";
    let bestImage = "";
    
    topStories.forEach((story, index) => {
        if (index === 15) {
            promptData += "=== OSTALE NOVICE ===\n\n";
        }
        
        const uniqueTitles = Array.from(new Set(story.sources.map((s: any) => s.title || ''))).filter((t: any) => t.length > 0);
        const titlesString = uniqueTitles.length > 0 ? uniqueTitles.join(' | ') : 'Ni na voljo';

        promptData += `[STORY ID: ${index}]\n- TOPIC: ${story.topic}\n- ORIGINAL TITLES: ${titlesString}\n- SUMMARY: ${story.summary}\n\n`;
        
        if (!bestImage && story.image_url && index < 15) {
            bestImage = story.image_url;
        }
    })

    const currentDateStr = new Intl.DateTimeFormat('sl-SI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

    const prompt = `
      You are an elite editor for a premium Slovenian morning news digest called 'Križišče' (similar to Axios or Politico Playbook).
      Your job is to compress the RAW NEWS below into a highly readable, structured daily briefing.
      You have NO other knowledge. If it is not in the RAW NEWS, it does not exist.
      
      CRITICAL TEMPORAL CONTEXT:
      TODAY IS: ${currentDateStr} (Morning). If a news source mentions an event happening on the current day, MUST write "danes" (today).
      
      RAW NEWS SUMMARIES:
      ${promptData}
      
      YOUR TASK:
      1. 'intro': 2-3 sentences. Write in a conversational, warm, and engaging "morning anchor" tone. Highlight the most important story FROM THE TOP NOVICE. DO NOT start with a greeting (no "Dobro jutro").
      2. 'categories': Create 3-5 categories. 
         - Titles allowed: "🏔️ Slovenija", "🌍 Svet", "💰 Gospodarstvo", "⚖️ Kronika", "🏆 Šport", "🎭 Zabava".
         - STRICT SORTING CRITICAL RULE: Any news involving abuse (zlorabe), crime, police investigations, or court cases MUST go into "⚖️ Kronika", regardless of who is involved (even chefs or celebrities).
         - Merge stories ONLY if they cover the EXACT SAME EVENT.
         - You MUST provide EXACTLY 3 or 4 items per category. Pick only the most impactful news.
      3. Each 'item.theme': 2-4 word punchy label.
      4. Each 'item.text': 1-2 short active sentences.
      5. 'number_of_the_day': (OPTIONAL) Extract ONE concrete, highly interesting number from ANY news story. 
         - If there are NO highly interesting numbers in the news today, completely OMIT this field.
         - 'number': Just the digit/format (e.g., "47", "1,2 milijona", "51").
         - 'description': A short, punchy explanation.
      6. 'quote_of_the_day': Extract ONE striking, controversial, or inspiring direct quote mentioned in the text. 
         - 'quote': The exact quote in Slovenian. Do not invent it.
         - 'author': The name of the person who said it.
         - 'story_id': The exact [STORY ID: X] from which the quote was taken.
         
      CRITICAL DEDUPLICATION RULE: The 'number_of_the_day' and 'quote_of_the_day' MUST be about different events, and ideally highlight details that were NOT already heavily summarized in the main categories.
      `;

    const generationConfig = { 
        responseMimeType: "application/json",
        responseSchema: newsletterSchema, 
        temperature: 0.4 
    };

    let aiData;
    try {
        console.log("🚀 Poskušam hiter in stabilen model: gemini-2.5-flash...");
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

    try {
        console.log("🔍 Začenjam hitro AI validacijo...");
        aiData = await validateOutput(aiData, promptData, currentDateStr);
        console.log("✅ AI validacija uspešno zaključena.");
    } catch (validationErr) {
        console.error("⚠️ Napaka pri AI validaciji, nadaljujem z osnovnimi podatki:", validationErr);
    }

    if (aiData.categories && Array.isArray(aiData.categories)) {
        const categoryOrder = ["🏔️ Slovenija", "🌍 Svet", "💰 Gospodarstvo", "⚖️ Kronika", "🏆 Šport", "🎭 Zabava"];
        aiData.categories.sort((a: any, b: any) => {
            let indexA = categoryOrder.indexOf(a.title);
            let indexB = categoryOrder.indexOf(b.title);
            if (indexA === -1) indexA = 99; 
            if (indexB === -1) indexB = 99;
            return indexA - indexB;
        });
    }

    let totalTextLength = 0;
    if (aiData.intro) totalTextLength += aiData.intro.split(/\s+/).length;
    
    if (aiData.categories && Array.isArray(aiData.categories)) {
        aiData.categories.forEach((cat: any) => {
            if (cat.items && Array.isArray(cat.items)) {
                cat.items.slice(0, 4).forEach((item: any) => {
                    if (item.theme) totalTextLength += item.theme.split(/\s+/).length;
                    if (item.text) totalTextLength += item.text.split(/\s+/).length;
                });
            }
        });
    }
    
    if (aiData.quote_of_the_day) {
        if (aiData.quote_of_the_day.quote) totalTextLength += aiData.quote_of_the_day.quote.split(/\s+/).length;
        if (aiData.quote_of_the_day.author) totalTextLength += aiData.quote_of_the_day.author.split(/\s+/).length;
    }
    
    if (aiData.number_of_the_day) {
        if (aiData.number_of_the_day.description) totalTextLength += aiData.number_of_the_day.description.split(/\s+/).length;
    }

    const calculatedReadingTime = Math.max(1, Math.ceil(totalTextLength / 200));

    const todayStr = new Intl.DateTimeFormat('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
    const subjectStr = `Jutranji pregled: ${todayStr} - krizisce.si`
    
    let categoriesHtml = '';

    aiData.categories.forEach((cat: any) => {
        let itemsHtml = '';
        
        if (cat.items && Array.isArray(cat.items)) {
            cat.items.slice(0, 4).forEach((item: any) => {
                let sourceLinksHtml = '';
                const linkMap = new Map<string, string>(); 
                
                let ids: number[] = [];
                if (Array.isArray(item.story_ids)) {
                    ids = item.story_ids;
                } else if (typeof item.story_id === 'number') {
                    ids = [item.story_id as number];
                } else if (typeof item.story_ids === 'number') {
                    ids = [item.story_ids as number];
                }
                
                ids.forEach((id: number) => {
                    const story = topStories[id];
                    if (story && Array.isArray(story.sources)) {
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
                    }
                });

                if (linkMap.size > 0) {
                    const linksArray = Array.from(linkMap.values());
                    sourceLinksHtml = `<div style="margin-top: 4px; font-size: 13px; color: #6B7280; font-family: -apple-system, Arial, sans-serif;">⮑ Beri na: ${linksArray.join(', ')}</div>`;
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
        }

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

    let quoteHtml = '';
    if (aiData.quote_of_the_day) {
        let quoteSourceHtml = '';
        const qId = aiData.quote_of_the_day.story_id;
        
        if (typeof qId === 'number' && topStories[qId]) {
            const story = topStories[qId];
            if (story.sources && story.sources.length > 0) {
                const firstSource = story.sources[0];
                const rawUrl = typeof firstSource === 'string' ? firstSource : firstSource.url;
                if (rawUrl) {
                    try {
                        const hostname = new URL(rawUrl).hostname.replace('www.', '');
                        let sname = hostname.split('.')[0];
                        sname = sname.charAt(0).toUpperCase() + sname.slice(1);
                        if (hostname.includes('rtvslo')) sname = 'RTV SLO';
                        if (hostname.includes('24ur')) sname = '24ur';
                        if (hostname.includes('siol')) sname = 'Siol';
                        if (hostname.includes('slovenskenovice')) sname = 'Slov. novice';
                        if (hostname.includes('delo')) sname = 'Delo';
                        if (hostname.includes('dnevnik')) sname = 'Dnevnik';
                        if (hostname.includes('zurnal24')) sname = 'Žurnal24';
                        if (hostname.includes('n1info')) sname = 'N1';
                        if (hostname.includes('svet24')) sname = 'Svet24';

                        quoteSourceHtml = `&nbsp; <a href="${rawUrl}" target="_blank" style="color: #9CA3AF; text-decoration: underline; font-size: 11px; font-weight: normal;">(Vir: ${sname})</a>`;
                    } catch(e) {}
                }
            }
        }

        quoteHtml = `
        <div style="background-color: #FFF7ED; border-left: 4px solid ${BRAND_COLOR}; padding: 24px; margin-top: 20px; margin-bottom: 40px; border-radius: 0 8px 8px 0;">
          <h3 style="font-size: 13px; color: #9A3412; font-weight: bold; margin-top: 0; margin-bottom: 12px; font-family: -apple-system, Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.1em;">
            💬 Izjava dneva
          </h3>
          <p style="font-size: 16px; line-height: 1.6; color: #431407; margin: 0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">
            "${aiData.quote_of_the_day.quote}"
          </p>
          <p style="font-size: 13px; color: #C2410C; margin: 0; font-family: -apple-system, Arial, sans-serif; font-weight: 600;">
            — ${aiData.quote_of_the_day.author} ${quoteSourceHtml}
          </p>
        </div>
        `;
    }

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
                    <p style="margin: 0 0 4px 0; font-size: 14px; color: ${BRAND_COLOR}; text-transform: uppercase; letter-spacing: 0.15em; font-family: -apple-system, Arial, sans-serif; font-weight: bold; text-align: center;">
                      Jutranji pregled
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #6B7280; font-family: -apple-system, Arial, sans-serif; text-align: center;">
                      ${todayStr}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 40px 24px;">

                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 15px;">
                      <tr>
                        <td align="left" valign="middle">
                          <p style="font-size: 18px; line-height: 1; color: #111827; margin: 0; font-family: -apple-system, Arial, sans-serif; font-weight: bold;">
                            Dobro jutro! ☕
                          </p>
                        </td>
                        <td align="right" valign="middle">
                          <span style="background-color: #F3F4F6; color: #6B7280; font-size: 11px; padding: 4px 10px; border-radius: 12px; font-family: -apple-system, Arial, sans-serif; font-weight: 600;">
                            ⏱️ Čas branja: ~${calculatedReadingTime} min
                          </span>
                        </td>
                      </tr>
                    </table>

                    <p style="font-size: 16px; line-height: 1.6; color: #111827; margin-top: 0; margin-bottom: 30px; font-family: -apple-system, Arial, sans-serif;">
                      ${aiData.intro}
                    </p>

                    ${proxyImageUrl ? `
                      <div style="margin-bottom: 35px; text-align: center;">
                         <img src="${proxyImageUrl}" alt="Poudarek dneva" width="550" style="width: 100%; max-width: 550px; height: auto; display: block; margin: 0 auto; border-radius: 8px; border: 1px solid #f3f4f6;">
                      </div>
                    ` : ''}

                    ${categoriesHtml}

                    ${aiData.number_of_the_day ? `
                    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; margin-top: 40px; margin-bottom: 20px; border-radius: 8px;">
                      <h3 style="font-size: 12px; color: #64748B; font-weight: bold; margin-top: 0; margin-bottom: 10px; font-family: -apple-system, Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.1em;">
                        📊 Številka dneva
                      </h3>
                      <p style="font-size: 15px; line-height: 1.5; color: #334155; margin: 0; font-family: -apple-system, Arial, sans-serif;">
                        <strong style="font-size: 22px; color: ${BRAND_COLOR}; margin-right: 6px;">${aiData.number_of_the_day.number}</strong> — ${aiData.number_of_the_day.description}
                      </p>
                    </div>
                    ` : ''}
                    
                    ${quoteHtml}

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
