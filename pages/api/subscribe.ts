import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

const resend = new Resend(process.env.RESEND_API_KEY);
const BRAND_COLOR = "#ea580c"; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, agreed } = req.body;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Prosimo, vnesite veljaven email naslov.' });
  }
  
  if (!agreed) {
    return res.status(400).json({ error: 'Za prijavo se morate strinjati in dovoliti pošiljanje.' });
  }

  try {
    // 1. PREVERIMO, ALI UPORABNIK ŽE OBSTAJA V BAZI
    const { data: existingUser, error: checkError } = await supabase
      .from('subscribers')
      .select('is_active')
      .eq('email', email)
      .single();

    if (existingUser) {
      if (existingUser.is_active) {
         // Že prijavljen in aktiven - ni treba ničesar spreminjati
         return res.status(200).json({ message: 'Ta e-mail naslov je že prijavljen na naše novice!' });
      } else {
         // Bil je odjavljen -> PONOVNO GA AKTIVIRAMO
         const { error: updateErr } = await supabase
           .from('subscribers')
           .update({ is_active: true, unsubscribed_at: null })
           .eq('email', email);
         
         if (updateErr) throw updateErr;
      }
    } else {
       // Popolnoma nov uporabnik -> VSTAVIMO NOV ZAPIS
       const { error: insertErr } = await supabase
         .from('subscribers')
         .insert([{ email }]);
       
       if (insertErr) throw insertErr;
    }

    // 2. ZGRADI LEP POZDRAVNI EMAIL (Welcome Mail)
    const welcomeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #E5E7EB; margin: 0 auto;">
                
                <tr>
                  <td align="center" style="padding: 40px 20px 30px 20px; border-bottom: 1px solid #E5E7EB;">
                    <img src="https://krizisce.si/logo.png" alt="Križišče" style="width: 56px; height: 56px; display: block; margin-bottom: 16px;">
                    <h1 style="margin: 0; font-size: 26px; color: #111827; font-family: Georgia, 'Times New Roman', serif; font-weight: bold;">
                      Dobrodošli v Križišču!
                    </h1>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px 30px; line-height: 1.6; color: #374151; font-size: 16px;">
                    <p style="margin-top: 0;">Pozdravljeni,</p>
                    <p>uspešno ste se prijavili na naš <strong>Jutranji pregled</strong>. Veseli nas, da ste del naše skupnosti bralcev.</p>
                    <p>Od zdaj naprej boste vsako jutro med prvimi prejeli pameten, strnjen in povsem objektiven pregled najpomembnejših novic iz Slovenije in sveta.</p>
                    <p style="margin-bottom: 35px;">Do takrat pa vas vabimo, da preverite aktualno dogajanje na naši spletni strani.</p>
                    
                    <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="border-radius: 8px;" bgcolor="${BRAND_COLOR}">
                          <a href="https://krizisce.si" target="_blank" style="font-size: 16px; color: #ffffff; text-decoration: none; padding: 14px 32px; display: inline-block; font-weight: bold; border-radius: 8px;">
                            Preberite zadnje novice
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="background-color: #F9FAFB; padding: 25px; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB;">
                    <p style="margin: 0;">© ${new Date().getFullYear()} Križišče. Vse pravice pridržane.</p>
                    <p style="margin: 8px 0 0 0;">To sporočilo ste prejeli, ker ste se prijavili na e-novice portala krizisce.si.</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // 3. POŠLJI EMAIL PREKO RESENDA
    await resend.emails.send({
      from: 'Križišče <jutro@krizisce.si>', 
      to: [email],
      subject: 'Dobrodošli! Vaša prijava je potrjena 🎉',
      html: welcomeHtml,
    });

    return res.status(200).json({ message: 'Hvala za prijavo! Na vaš e-mail smo poslali potrditev.' });
  } catch (e: any) {
    console.error('Napaka pri prijavi:', e);
    return res.status(500).json({ error: 'Nekaj je šlo narobe. Prosimo, poskusite znova.' });
  }
}
