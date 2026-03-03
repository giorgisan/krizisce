import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
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

    // 2. Čiščenje in deduplikacija tem
    const uniqueTopics = new Map<string, string>()
    if (analysisRows) {
        analysisRows.forEach(row => {
            const items = Array.isArray(row.data) ? row.data : []
            items.forEach(item => {
                if (!uniqueTopics.has(item.topic)) {
                    uniqueTopics.set(item.topic, item.summary)
                }
            })
        })
    }

    if (uniqueTopics.size === 0) {
        return res.status(200).json({ message: "Ni podatkov za newsletter." })
    }

    let promptData = ""
    uniqueTopics.forEach((summary, topic) => {
        promptData += `- TOPIC: ${topic}\n  SUMMARY: ${summary}\n\n`
    })

    // 3. NOVI AI PROMPT (Strukturiran, po vzoru tvojega News Digesta)
    const prompt = `
      You are the Editor-in-Chief of a premium Slovenian morning news briefing called 'Križišče'.
      Your goal is to write a highly structured, easily scannable, and quick daily digest for readers enjoying their morning coffee.

      Here is the raw data (topics and summaries) from the last 24 hours:
      ${promptData}

      Your task:
      Organize the most important news into logical sections. Discard minor, duplicate, or irrelevant news.
      Write in perfect, professional SLOVENIAN language.
      Format the news as punchy bullet points. Bold the main entity or subject at the start of each bullet point.

      You MUST categorize the news into the following sections (only use the ones that have relevant news):
      - 🇸🇮 Slovenija in regija
      - 🌍 Globalno dogajanje
      - 💻 Gospodarstvo in Tehnologija
      - ⚽ Šport
      - ☕ Kaj nas čaka danes (Extract or predict events happening TODAY from the data)

      RETURN STRICTLY HTML CODE (no markdown \`\`\` tags, no intro text, just raw HTML). 
      Use exactly this HTML structure for EACH section:
      
      <h3 style="font-size: 15px; color: #111827; margin-bottom: 12px; margin-top: 24px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #E5E7EB; padding-bottom: 6px;">[EMOJI] [SECTION TITLE]</h3>
      <ul style="font-size: 15px; line-height: 1.6; color: #374151; padding-left: 20px; margin-bottom: 0;">
        <li style="margin-bottom: 10px;"><strong>[Bold Topic]:</strong> [Short, punchy summary in Slovenian]</li>
      </ul>
    `

    // Uporabimo manjšo temperaturo (0.4), da bo AI bolj faktografski in manj "poetičen"
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { temperature: 0.4 } })
    const result = await model.generateContent(prompt)
    let aiHtml = result.response.text()
    
    // Očistimo morebitne markdown ostanke
    aiHtml = aiHtml.replace(/```html/g, '').replace(/```/g, '').trim()

    const todayStr = new Intl.DateTimeFormat('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
    const subjectStr = `[PREDOGLED] Križišče Brifing (${todayStr})`
    
    const finalEmailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <div style="text-align: center; padding: 24px; border-bottom: 1px solid #E5E7EB;">
            <h1 style="margin: 0; font-size: 24px; color: #111827; font-weight: 800; letter-spacing: -0.05em;">
              Križišče <span style="color: #10B981;">Brifing</span>
            </h1>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em;">
              ${todayStr}
            </p>
          </div>

          <div style="padding: 10px 24px 32px 24px;">
            ${aiHtml}
          </div>

          <div style="text-align: center; padding: 0 24px 40px 24px;">
            <a href="https://krizisce.si" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Preveri vse današnje novice ↗
            </a>
          </div>

          <div style="background-color: #F3F4F6; padding: 20px; text-align: center; font-size: 12px; color: #9CA3AF;">
            <p><strong>TO JE TESTNI PREDOGLED ZA UREDNIKA</strong></p>
            <p>V končni verziji bo tukaj gumb "Odobri in pošlji".</p>
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
