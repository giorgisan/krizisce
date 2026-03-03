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
    // 1. ZAJEM ZA ZADNJIH 30 UR (Da zajamemo tudi včerajšnje jutro in današnje sveže napovedi)
    const timeWindow = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString()
    const { data: analysisRows, error } = await supabase
      .from('media_analysis')
      .select('data')
      .gte('created_at', timeWindow)
      .order('created_at', { ascending: false })

    if (error) throw error

    // 2. ČIŠČENJE IN RAZVRŠČANJE (Matematična določitev glavne novice)
    const topicMap = new Map<string, any>()
    if (analysisRows) {
        analysisRows.forEach(row => {
            const items = Array.isArray(row.data) ? row.data : []
            items.forEach(item => {
                const existing = topicMap.get(item.topic);
                const sourceCount = Array.isArray(item.sources) ? item.sources.length : 1;
                
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

    const topStories = Array.from(topicMap.values())
        .sort((a, b) => b.sourceCount - a.sourceCount)
        .slice(0, 10); // Top 10 je dovolj za AI

    if (topStories.length === 0) {
        return res.status(200).json({ message: "Ni podatkov za newsletter." })
    }

    let promptData = ""
    topStories.forEach((story, index) => {
        promptData += `[STORY #${index + 1}]\n- TOPIC: ${story.topic}\n- SUMMARY: ${story.summary}\n- HAS_IMAGE: ${story.image_url ? story.image_url : 'NO_IMAGE'}\n\n`
    })

    // 3. OSTER, PROFESIONALEN PROMPT (Po Claudovih nasvetih)
    const prompt = `
      You are the Editor-in-Chief of 'Križišče', Slovenia's sharpest morning news digest.
      Tone: direct, confident, professional, zero fluff. Like a trusted colleague briefing you before a meeting.
      
      Top Slovenian stories from the last 30 hours, ORDERED BY IMPORTANCE (Story #1 is the most covered):
      ${promptData}

      RULES:
      - intro: 1-2 punchy sentences welcoming the reader and setting the daily vibe.
      - featured_story: YOU MUST USE [STORY #1]. It is objectively the most important. Headline max 10 words, summary max 3 sentences. Copy its HAS_IMAGE url exactly.
      - categories: Group 4-5 OTHER stories into logical sections (e.g. 🌍 Svet, 🇸🇮 Slovenija, ⚽ Šport). Headline max 8 words, 1-2 sentences summary.
      - today_watch: Extract explicitly mentioned scheduled events/matches/announcements happening TODAY from the data. If nothing concrete is in the data, return an EMPTY ARRAY. DO NOT invent.
      - closing_line: One punchy sentence. What should the reader keep in mind today?
      - LANGUAGE: Perfect, professional Slovenian.
    `

    const responseSchema = {
        type: SchemaType.OBJECT,
        properties: {
            intro: { type: SchemaType.STRING },
            featured_story: {
                type: SchemaType.OBJECT,
                properties: {
                    headline: { type: SchemaType.STRING },
                    summary: { type: SchemaType.STRING },
                    image_url: { type: SchemaType.STRING }
                },
                required: ["headline", "summary", "image_url"]
            },
            categories: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        title: { type: SchemaType.STRING },
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
                items: { type: SchemaType.STRING }
            },
            closing_line: { type: SchemaType.STRING }
        },
        required: ["intro", "featured_story", "categories", "today_watch", "closing_line"]
    };

    const generationConfig = { 
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2 // Nizka temperatura za stabilnost in poslušnost
    };

    let aiData;
    try {
        // Stabilni 2.5-pro je sedaj primarni
        const modelPro = genAI.getGenerativeModel({ model: "gemini-2.5-pro", generationConfig });
        const resultPro = await modelPro.generateContent(prompt);
        aiData = JSON.parse(resultPro.response.text());
    } catch (errPro: any) {
        console.warn("⚠️ Gemini 2.5 Pro failed, fallback to 2.5-flash...");
        const modelFlash = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig });
        const resultFlash = await modelFlash.generateContent(prompt);
        aiData = JSON.parse(resultFlash.response.text());
    }

    const todayStr = new Intl.DateTimeFormat('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
    const subjectStr = `[PREDOGLED] Križišče Brifing (${todayStr})`
    
    // 4. E-MAIL SAFE HTML DIZAJN (Brez flexboxa, inline CSS, varni fonti)
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
              <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; border: 1px solid #E5E7EB; overflow: hidden;">
                
                <tr>
                  <td align="center" style="padding: 30px 20px; border-bottom: 1px solid #E5E7EB;">
                    <img src="https://krizisce.si/logo.png" alt="Križišče Logo" style="width: 44px; height: 44px; margin-bottom: 12px; display: block;">
                    <h1 style="margin: 0; font-size: 28px; color: #111827; font-family: Georgia, 'Times New Roman', serif; font-weight: normal; letter-spacing: -0.02em;">
                      Križišče <span style="color: #10B981; font-weight: bold;">Brifing</span>
                    </h1>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.1em; font-family: -apple-system, Arial, sans-serif;">
                      ${todayStr}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 35px 24px;">

                    <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-top: 0; margin-bottom: 30px; font-family: -apple-system, Arial, sans-serif;">
                      ${aiData.intro}
                    </p>

                    ${aiData.featured_story.image_url && aiData.featured_story.image_url !== 'NO_IMAGE' ? `
                      <div style="margin-bottom: 16px; border: 1px solid #E5E7EB; border-radius: 6px; overflow: hidden;">
                         <img src="https://images.weserv.nl/?url=${encodeURIComponent(aiData.featured_story.image_url)}&w=600&output=webp" alt="Glavna novica" style="width: 100%; height: auto; display: block;">
                      </div>
                    ` : ''}
                    <h2 style="font-size: 24px; color: #111827; font-weight: bold; margin-top: 0; margin-bottom: 12px; line-height: 1.3; font-family: Georgia, 'Times New Roman', serif;">
                      ${aiData.featured_story.headline}
                    </h2>
                    <p style="font-size: 16px; line-height: 1.6; color: #4B5563; margin-top: 0; margin-bottom: 35px; font-family: -apple-system, Arial, sans-serif;">
                      ${aiData.featured_story.summary}
                    </p>

                    ${aiData.categories.map((cat: any) => `
                      <div style="margin-bottom: 25px;">
                        <h3 style="font-size: 14px; color: #111827; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0; margin-bottom: 12px; font-weight: bold; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px; font-family: -apple-system, Arial, sans-serif;">
                          ${cat.title}
                        </h3>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                          ${cat.stories.map((story: any) => `
                            <tr>
                              <td valign="top" style="padding-bottom: 12px; font-family: -apple-system, Arial, sans-serif; font-size: 15px; line-height: 1.5; color: #374151;">
                                <strong style="color: #111827;">${story.headline}:</strong> ${story.summary}
                              </td>
                            </tr>
                          `).join('')}
                        </table>
                      </div>
                    `).join('')}

                    ${aiData.today_watch && aiData.today_watch.length > 0 ? `
                      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                        <h3 style="font-size: 16px; color: #0F172A; font-weight: bold; margin-top: 0; margin-bottom: 12px; font-family: -apple-system, Arial, sans-serif;">
                          ☕ Kaj nas čaka danes
                        </h3>
                        <ul style="font-size: 15px; line-height: 1.5; color: #475569; padding-left: 20px; margin-top: 0; margin-bottom: 0; font-family: -apple-system, Arial, sans-serif;">
                          ${aiData.today_watch.map((event: string) => `
                            <li style="margin-bottom: 6px;">${event}</li>
                          `).join('')}
                        </ul>
                      </div>
                    ` : ''}

                    <p style="font-size: 15px; line-height: 1.6; color: #111827; font-weight: bold; margin-top: 0; margin-bottom: 0; text-align: center; font-style: italic; font-family: Georgia, 'Times New Roman', serif;">
                      ${aiData.closing_line}
                    </p>

                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding: 0 24px 40px 24px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="border-radius: 6px;" bgcolor="#111827">
                          <a href="https://krizisce.si" target="_blank" style="font-size: 15px; font-family: -apple-system, Arial, sans-serif; color: #ffffff; text-decoration: none; padding: 14px 30px; border: 1px solid #111827; display: inline-block; border-radius: 6px; font-weight: bold;">
                            Preberi več na Križišče.si
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="background-color: #F9FAFB; padding: 24px; border-top: 1px solid #E5E7EB; font-family: -apple-system, Arial, sans-serif; font-size: 12px; color: #6B7280; line-height: 1.5;">
                    <p style="margin: 0 0 12px 0;">
                      <strong>[PREDOGLED]</strong> To je testni mail. Gumb "Odobri in pošlji" pride v produkciji.
                    </p>
                    <p style="margin: 0 0 12px 0;">
                      Prejeli ste to sporočilo, ker ste prijavljeni na jutranji brifing portala Križišče.si.
                    </p>
                    <p style="margin: 0;">
                      <a href="#" style="color: #6B7280; text-decoration: underline;">Odjava od obvestil</a> | 
                      <a href="mailto:gjkcme@gmail.com" style="color: #6B7280; text-decoration: underline;">Kontakt</a>
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

    // 5. POŠILJANJE PREDOGLEDA
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
