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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Zajem podatkov iz media_analysis za zadnjih 30 ur (da imamo dovolj mesa)
    const timeWindow = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString()
    const { data: analysisRows, error } = await supabase
      .from('media_analysis')
      .select('data')
      .gte('created_at', timeWindow)
      .order('created_at', { ascending: false })

    if (error) throw error

    // 2. Čiščenje, deduplikacija in RAZVRŠČANJE PO ODMEVNOSTI
    const topicMap = new Map<string, any>()
    if (analysisRows) {
        analysisRows.forEach(row => {
            const items = Array.isArray(row.data) ? row.data : []
            items.forEach(item => {
                const existing = topicMap.get(item.topic);
                const sourceCount = Array.isArray(item.sources) ? item.sources.length : 1;
                
                // Obdržimo temo, če je še ni, ali pa če ima trenutni zapis več virov (boljša analiza)
                if (!existing || sourceCount > existing.sourceCount) {
                    topicMap.set(item.topic, {
                        topic: item.topic,
                        summary: item.summary,
                        image_url: item.main_image && item.main_image.startsWith('http') ? item.main_image : null,
                        sourceCount: sourceCount
                    })
                }
            })
        })
    }

    // Sortiramo padajoče po številu virov in vzamemo TOP 12 zgodb, da ima AI na voljo celoten presek dneva
    const topStories = Array.from(topicMap.values())
        .sort((a, b) => b.sourceCount - a.sourceCount)
        .slice(0, 12);

    if (topStories.length === 0) {
        return res.status(200).json({ message: "Ni podatkov za newsletter." })
    }

    let promptData = ""
    topStories.forEach((story) => {
        promptData += `- TOPIC: ${story.topic}\n  SUMMARY: ${story.summary}\n  SOURCES_COUNT: ${story.sourceCount}\n  HAS_IMAGE: ${story.image_url ? story.image_url : 'NO_IMAGE'}\n\n`
    })

    // 3. VRHUNSKI UREDNIŠKI PROMPT IN JSON SHEMA
    const prompt = `
      You are the expert Editor-in-Chief of 'Križišče', Slovenia's premium morning news digest.
      Your tone is smart, engaging, informative, and perfectly prepared to brief the reader for the day ahead (similar to Morning Brew or Axios, but in Slovenian).
      
      Here are the most covered stories in Slovenia from the last 24 hours, sorted by importance:
      ${promptData}

      YOUR TASK:
      1. Write an engaging 'intro': A warm, smart morning greeting that smoothly summarizes the general vibe of today's news in 2-3 sentences.
      2. Choose the absolute most important story for 'featured_story'. YOU MUST CHOOSE A STORY THAT HAS A VALID URL IN 'HAS_IMAGE'.
      3. Group 4 to 6 other important stories into 2 or 3 logical 'categories' (e.g., 🌍 Globalno dogajanje, 💻 Gospodarstvo in Tehnologija, 🇸🇮 Slovenija in regija). Use emojis in category titles.
      4. Create a 'today_watch' section. Extract explicit events happening TODAY. If there are no specific scheduled events, write 2 smart bullet points about what the main ongoing theme/focus of the day will likely be.
      5. Write a short, punchy 'closing' sentence to sign off.

      CRITICAL: Write EVERYTHING in perfect, professional SLOVENIAN language.
    `

    const responseSchema = {
        type: SchemaType.OBJECT,
        properties: {
            intro: { 
                type: SchemaType.STRING, 
                description: "Pameten, tekoč in privlačen uvodni odstavek (2-3 stavki), ki bralca pozdravi in povzame 'vibe' dneva." 
            },
            featured_story: {
                type: SchemaType.OBJECT,
                properties: {
                    headline: { type: SchemaType.STRING, description: "Udaren naslov glavne novice." },
                    summary: { type: SchemaType.STRING, description: "Tekoč, zanimiv odstavek o glavni zgodbi (cca 3-4 stavki)." },
                    image_url: { type: SchemaType.STRING, description: "Obvezno prekopiraj URL slike iz HAS_IMAGE za to zgodbo." }
                },
                required: ["headline", "summary", "image_url"]
            },
            categories: {
                type: SchemaType.ARRAY,
                description: "Kategorizirane ostale pomembne novice.",
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        title: { type: SchemaType.STRING, description: "Ime kategorije z emojijem (npr. '🌍 Svet', '🇸🇮 Slovenija')." },
                        stories: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    headline: { type: SchemaType.STRING },
                                    summary: { type: SchemaType.STRING }
                                },
                                required: ["headline", "summary"]
                            }
                        }
                    },
                    required: ["title", "stories"]
                }
            },
            today_watch: {
                type: SchemaType.ARRAY,
                description: "Seznam 2-3 stvari, ki se bodo zgodile danes ali pa so fokus današnjega dne.",
                items: { type: SchemaType.STRING }
            },
            closing: { 
                type: SchemaType.STRING, 
                description: "Kratek, optimističen ali pronicljiv zaključek (1 stavek)." 
            }
        },
        required: ["intro", "featured_story", "categories", "today_watch", "closing"]
    };

    const generationConfig = { 
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.4 
    };

    let aiData;
    try {
        console.log("Poskušam z gemini-3-pro-preview...");
        const model3 = genAI.getGenerativeModel({ model: "gemini-3-pro-preview", generationConfig });
        const result3 = await model3.generateContent(prompt);
        aiData = JSON.parse(result3.response.text());
    } catch (err3: any) {
        console.warn("⚠️ Gemini 3 Pro nedosegljiv, uporabljam stabilni gemini-2.5-pro...");
        try {
            const model25pro = genAI.getGenerativeModel({ model: "gemini-2.5-pro", generationConfig });
            const result25pro = await model25pro.generateContent(prompt);
            aiData = JSON.parse(result25pro.response.text());
        } catch (err25pro: any) {
            console.warn("⚠️ Gemini 2.5 Pro nedosegljiv, uporabljam najhitrejši gemini-2.5-flash...");
            const modelFlash = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig });
            const resultFlash = await modelFlash.generateContent(prompt);
            aiData = JSON.parse(resultFlash.response.text());
        }
    }

    const todayStr = new Intl.DateTimeFormat('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
    const subjectStr = `[PREDOGLED] Križišče Brifing (${todayStr})`
    
    // 4. GRADNJA VRHUNSKEGA HTML DIZAJNA
    const finalEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: 'Inter', -apple-system, sans-serif; -webkit-font-smoothing: antialiased;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; margin-top: 20px; margin-bottom: 20px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
          
          <div style="text-align: center; padding: 30px 20px; border-bottom: 1px solid #E5E7EB; background-color: #ffffff;">
            <img src="https://krizisce.si/logo.png" alt="Križišče Logo" style="width: 44px; height: 44px; margin-bottom: 12px; display: inline-block;">
            <h1 style="margin: 0; font-size: 30px; color: #111827; font-family: 'Playfair Display', serif; font-weight: 800; letter-spacing: -0.02em;">
              Križišče <span style="color: #10B981;">Brifing</span>
            </h1>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">
              ${todayStr}
            </p>
          </div>

          <div style="padding: 35px 24px;">

            <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-top: 0; margin-bottom: 30px;">
              ${aiData.intro}
            </p>

            ${aiData.featured_story.image_url && aiData.featured_story.image_url !== 'NO_IMAGE' ? `
              <div style="margin-bottom: 20px; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                 <img src="${aiData.featured_story.image_url}" alt="Glavna zgodba" style="width: 100%; height: auto; display: block;">
              </div>
            ` : ''}
            <h2 style="font-size: 24px; color: #111827; font-weight: 800; margin-top: 0; margin-bottom: 12px; line-height: 1.3; font-family: 'Playfair Display', serif;">
              ${aiData.featured_story.headline}
            </h2>
            <p style="font-size: 16px; line-height: 1.7; color: #4B5563; margin-top: 0; margin-bottom: 35px;">
              ${aiData.featured_story.summary}
            </p>

            ${aiData.categories.map((cat: any) => `
              <div style="margin-bottom: 30px;">
                <h3 style="font-size: 15px; color: #111827; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0; margin-bottom: 16px; font-weight: 700; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px;">
                  ${cat.title}
                </h3>
                <ul style="margin: 0; padding-left: 0; list-style-type: none; color: #374151; font-size: 15px; line-height: 1.6;">
                  ${cat.stories.map((story: any) => `
                    <li style="margin-bottom: 16px; padding-left: 16px; border-left: 3px solid #10B981;">
                      <strong style="color: #111827; display: block; margin-bottom: 2px;">${story.headline}</strong> 
                      <span style="color: #4B5563;">${story.summary}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            `).join('')}

            ${aiData.today_watch && aiData.today_watch.length > 0 ? `
              <div style="background-color: #F8FAFC; border-radius: 10px; padding: 24px; margin-bottom: 30px; border: 1px solid #E2E8F0;">
                <h3 style="font-size: 16px; color: #0F172A; font-weight: 700; margin-top: 0; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                  ☕ Kaj nas čaka danes
                </h3>
                <ul style="font-size: 15px; line-height: 1.6; color: #475569; padding-left: 20px; margin-top: 0; margin-bottom: 0;">
                  ${aiData.today_watch.map((event: string) => `
                    <li style="margin-bottom: 8px;">${event}</li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}

            <p style="font-size: 15px; line-height: 1.6; color: #111827; font-weight: 600; margin-top: 0; margin-bottom: 0; text-align: center; font-style: italic;">
              ${aiData.closing}
            </p>

          </div>

          <div style="text-align: center; padding: 10px 24px 40px 24px;">
            <a href="https://krizisce.si" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 50px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              Preveri dogajanje v živo ↗
            </a>
          </div>

          <div style="background-color: #111827; padding: 24px; text-align: center; font-size: 12px; color: #9CA3AF;">
            <p style="margin: 0 0 8px 0; color: #ffffff; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">To je testni predogled</p>
            <p style="margin: 0;">V končni produkcijski verziji bo tukaj tvoj gumb "Odobri in pošlji vsem".</p>
          </div>

        </div>
      </body>
      </html>
    `;

    // 4. SHRANJEVANJE V BAZO
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

    // 5. POŠILJANJE NA TVOJ MAIL PREKO RESENDA
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
