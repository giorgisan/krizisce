import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Resend } from 'resend'

export const maxDuration = 60; // Dovolimo do 60 sekund za izvajanje

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Avtorizacija (zaščita cron joba)
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
                // Če te teme še nimamo, jo dodamo (vzame najnovejšo verzijo povzetka)
                if (!uniqueTopics.has(item.topic)) {
                    uniqueTopics.set(item.topic, item.summary)
                }
            })
        })
    }

    if (uniqueTopics.size === 0) {
        return res.status(200).json({ message: "Ni podatkov za newsletter." })
    }

    // Priprava teksta za AI
    let promptData = ""
    uniqueTopics.forEach((summary, topic) => {
        promptData += `- TEMA: ${topic}\n  POVZETEK: ${summary}\n\n`
    })

    // 3. AI Uredniški Prompt
    const prompt = `
      Ti si glavni urednik jutranjega novičarskega brifinga 'Križišče'. Tvoj cilj je napisati vrhunski, tekoč in hiter pregled dogajanja (newsletter) za bralce, ki pijejo jutranjo kavo.
      
      Tukaj so ključne teme in povzetki včerajšnjega dogajanja v Sloveniji in po svetu:
      ${promptData}

      Tvoja naloga:
      1. Napiši 2 do 3 kratke, privlačne odstavke (Digest), ki tekoče povzamejo glavno dogajanje. Ne naštevaj po alinejah, ampak napiši kot kratko radijsko poročilo. Tone naj bo profesionalen, objektiven, a prijeten za branje.
      2. Izlušči ali predvidi dogodke, ki se bodo očitno zgodili DANES (napovedi, tekme, sestanki, stavke), in ustvari posebno sekcijo "Kaj nas čaka danes". Tukaj uporabi 2-3 kratke alineje.
      
      VRNI IZKLJUČNO HTML KODO (brez markdown \`\`\` oznak, samo surov HTML). Uporabi naslednjo strukturo:
      <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 16px;">[Tvoj prvi odstavek]</p>
      <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 24px;">[Tvoj drugi/tretji odstavek]</p>
      <h2 style="font-size: 18px; color: #111827; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px; margin-bottom: 16px;">Kaj nas čaka danes ☕</h2>
      <ul style="font-size: 15px; line-height: 1.6; color: #4B5563; padding-left: 20px;">
        <li style="margin-bottom: 8px;">[Prva napoved]</li>
        <li style="margin-bottom: 8px;">[Druga napoved]</li>
      </ul>
    `

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { temperature: 0.6 } })
    const result = await model.generateContent(prompt)
    let aiHtml = result.response.text()
    
    // Očistimo morebitne markdown ostanke
    aiHtml = aiHtml.replace(/```html/g, '').replace(/```/g, '').trim()

    // 4. Sestava končnega dizajna elektronskega sporočila
    const todayStr = new Intl.DateTimeFormat('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
    
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

    // 5. Pošiljanje preko Resenda na tvoj mail
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Križišče <onboarding@resend.dev>', // Začasni Resend email za testiranje
      to: ['gjakac@gmail.com'],
      subject: `[PREDOGLED] Križišče Brifing (${todayStr})`,
      html: finalEmailHtml,
    });

    if (emailError) throw emailError;

    return res.status(200).json({ success: true, message: "Predogled poslan na gjakac@gmail.com!", id: emailData?.id })

  } catch (e: any) {
      console.error("Newsletter Error:", e)
      return res.status(500).json({ error: e.message })
  }
}
