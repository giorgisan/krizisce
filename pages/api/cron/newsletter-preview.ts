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
    // 1. Zajem podatkov iz media_analysis za zadnjih 24 ur
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

    // 3. ANGLEŠKI PROMPT S SLOVENSKIM IZHODOM
    const prompt = `
      You are the Editor-in-Chief of a Slovenian morning news briefing called 'Križišče'.
      Your goal is to write a premium, smooth, and quick daily digest (newsletter) for readers enjoying their morning coffee.

      Here are the key topics and summaries of yesterday's events in Slovenia and the world:
      ${promptData}

      Your task:
      1. Write 2 to 3 short, engaging paragraphs (Digest) that smoothly summarize the main events. Do NOT use bullet points here. Write it like a short, flowing radio report. The tone should be professional, objective, but pleasant to read.
      2. Extract or predict events that will obviously happen TODAY (announcements, matches, meetings, strikes) from the provided text, and create a special section called "Kaj nas čaka danes". Use 2-3 short bullet points for this.

      CRITICAL INSTRUCTION: The entire generated text MUST be written in perfect SLOVENIAN language.
      
      RETURN STRICTLY HTML CODE (no markdown \`\`\` tags, just raw HTML). Use the following exact structure:
      <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 16px;">[Your first paragraph in Slovenian]</p>
      <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 24px;">[Your second/third paragraph in Slovenian]</p>
      <h2 style="font-size: 18px; color: #111827; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px; margin-bottom: 16px;">Kaj nas čaka danes ☕</h2>
      <ul style="font-size: 15px; line-height: 1.6; color: #4B5563; padding-left: 20px;">
        <li style="margin-bottom: 8px;">[First prediction in Slovenian]</li>
        <li style="margin-bottom: 8px;">[Second prediction in Slovenian]</li>
      </ul>
    `

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { temperature: 0.6 } })
    const result = await model.generateContent(prompt)
    let aiHtml = result.response.text()
    
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

          <div style="padding: 32px 24px;">
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
      to: ['gjkcme@gmail.com'], // Tvoj pravi email za Resend
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
