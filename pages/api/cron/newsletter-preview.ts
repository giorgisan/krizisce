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
    // 1. Zajem podatkov iz media_analysis za strogo zadnjih 24 ur
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: analysisRows, error } = await supabase
      .from('media_analysis')
      .select('data')
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false })

    if (error) throw error

    // 2. Čiščenje, deduplikacija in RAZVRŠČANJE PO ODMEVNOSTI
    const topicMap = new Map<string, any>()
    if (analysisRows) {
        analysisRows.forEach(row => {
            const items = Array.isArray(row.data) ? row.data : []
            items.forEach(item => {
                const existing = topicMap.get(item.topic);
                const sourceCount = Array.isArray(item.sources) ? item.sources.length : 0;
                
                // Obdržimo temo, če je še ni, ali pa če ima trenutni zapis več navedenih virov
                if (!existing || sourceCount > existing.sourceCount) {
                    topicMap.set(item.topic, {
                        topic: item.topic,
                        summary: item.summary,
                        image_url: item.main_image || null,
                        sourceCount: sourceCount
                    })
                }
            })
        })
    }

    // Pretvorimo v array, sortiramo padajoče po številu virov in vzamemo SAMO TOP 6 zgodb!
    const topStories = Array.from(topicMap.values())
        .sort((a, b) => b.sourceCount - a.sourceCount)
        .slice(0, 6);

    if (topStories.length === 0) {
        return res.status(200).json({ message: "Ni podatkov za newsletter." })
    }

    let promptData = ""
    topStories.forEach((story) => {
        promptData += `- TOPIC: ${story.topic}\n  SUMMARY: ${story.summary}\n  SOURCES_COUNT: ${story.sourceCount}\n  IMAGE: ${story.image_url || 'none'}\n\n`
    })

    // 3. AI PROMPT - Direkten, profesionalen, brez "fluff-a"
    const prompt = `
      You are the Editor-in-Chief of 'Križišče', Slovenia's sharpest morning news digest.
      Tone: direct, confident, zero fluff. Like a trusted colleague briefing you before a meeting.
      
      Top Slovenian stories from the last 24 hours:
      ${promptData}

      RULES:
      - featured_story: the single highest-impact story. headline max 10 words, summary max 2 sentences. Copy the IMAGE url from the data exactly.
      - other_stories: 4-5 stories. Each: headline max 8 words, one sentence summary.
      - today_watch: ONLY include if explicitly mentioned in the data above (scheduled events, matches, sessions, deadlines). If nothing concrete — return empty array. DO NOT invent.
      - closing_line: one punchy sentence. What should the reader keep in mind today?
      - All text in professional Slovenian. No filler phrases like "V današnjem dnevu..." or "Poročajo, da...".
    `

    const responseSchema = {
        type: SchemaType.OBJECT,
        properties: {
            featured_story: {
                type: SchemaType.OBJECT,
                properties: {
                    headline: { type: SchemaType.STRING },
                    summary: { type: SchemaType.STRING },
                    image_url: { type: SchemaType.STRING, description: "Kopiraj IMAGE url iz vhodnih podatkov za to zgodbo. Če je 'none', vrni prazno." }
                },
                required: ["headline", "summary", "image_url"]
            },
            other_stories: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        headline: { type: SchemaType.STRING },
                        summary: { type: SchemaType.STRING }
                    },
                    required: ["headline", "summary"]
                }
            },
            today_watch: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING }
            },
            closing_line: { type: SchemaType.STRING }
        },
        required: ["featured_story", "other_stories", "today_watch", "closing_line"]
    };

    const generationConfig = { 
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.3 // Še malenkost znižana za večjo natančnost in sledenje pravilom
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
            <img src="https://krizisce.si/logo.png" alt="Križišče Logo" style="width: 40px; height: 40px; margin-bottom: 10px; display: inline-block;">
            <h1 style="margin: 0; font-size: 28px; color: #111827; font-family: 'Playfair Display', serif; font-weight: 800; letter-spacing: -0.02em;">
              Križišče <span style="color: #10B981;">Brifing</span>
            </h1>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">
              ${todayStr}
            </p>
          </div>

          <div style="padding: 30px 24px;">

            ${aiData.featured_story.image_url && aiData.featured_story.image_url !== 'none' ? `
              <div style="margin-bottom: 16px; border-radius: 8px; overflow: hidden;">
                 <img src="${aiData.featured_story.image_url}" alt="Zgodba dneva" style="width: 100%; height: auto; display: block; border-radius: 8px;">
              </div>
            ` : ''}
            <h2 style="font-size: 22px; color: #111827; font-weight: 800; margin-top: 0; margin-bottom: 12px; line-height: 1.3;">
              ${aiData.featured_story.headline}
            </h2>
            <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-top: 0; margin-bottom: 32px;">
              ${aiData.featured_story.summary}
            </p>

            <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
              <h3 style="font-size: 13px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0; margin-bottom: 16px; font-weight: 700;">Drugi poudarki</h3>
              <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 15px; line-height: 1.6;">
                ${aiData.other_stories.map((story: any) => `
                  <li style="margin-bottom: 12px;"><strong>${story.headline}:</strong> ${story.summary}</li>
                `).join('')}
              </ul>
            </div>

            ${aiData.today_watch && aiData.today_watch.length > 0 ? `
              <h3 style="font-size: 18px; color: #111827; font-weight: 800; border-bottom: 2px solid #10B981; padding-bottom: 8px; margin-bottom: 16px; display: inline-block;">Kaj nas čaka danes</h3>
              <ul style="font-size: 15px; line-height: 1.6; color: #4B5563; padding-left: 20px; margin-top: 0; margin-bottom: 32px;">
                ${aiData.today_watch.map((event: string) => `
                  <li style="margin-bottom: 8px;">${event}</li>
                `).join('')}
              </ul>
            ` : ''}

            <p style="font-size: 15px; line-height: 1.6; color: #111827; font-weight: 600; margin-top: 0; margin-bottom: 0; text-align: center; font-style: italic;">
              ${aiData.closing_line}
            </p>

          </div>

          <div style="text-align: center; padding: 10px 24px 40px 24px;">
            <a href="https://krizisce.si" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; transition: background-color 0.2s;">
              Preveri dogajanje v živo ↗
            </a>
          </div>

          <div style="background-color: #111827; padding: 20px; text-align: center; font-size: 12px; color: #9CA3AF;">
            <p style="margin: 0 0 5px 0;"><strong>TO JE TESTNI PREDOGLED ZA UREDNIKA</strong></p>
            <p style="margin: 0;">V končni verziji bo tukaj gumb "Odobri in pošlji".</p>
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
