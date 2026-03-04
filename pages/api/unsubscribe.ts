import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ker smo v send-newsletter.ts zamenjali {{USER_EMAIL}} z UUID, 
  // parameter ?email= zdaj dejansko nosi UUID uporabnika. To je najbolj varno!
  const userId = req.query.email as string;

  if (!userId) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1 style="color: #ef4444;">Napaka</h1>
        <p>Neveljavna povezava za odjavo.</p>
      </div>
    `);
  }

  try {
    // 1. Najprej poiščemo, kdo to sploh je, da mu lahko izpišemo njegov mail na zaslon
    const { data: user, error: findError } = await supabase
      .from('subscribers')
      .select('email')
      .eq('id', userId) // Iščemo po UUID!
      .single();

    if (findError || !user) {
      throw new Error("Uporabnik ne obstaja.");
    }

    // 2. V bazi posodobimo 'is_active' na false IN zapišemo datum odjave
    const { error } = await supabase
      .from('subscribers')
      .update({ 
        is_active: false,
        unsubscribed_at: new Date().toISOString() 
      })
      .eq('id', userId);

    if (error) throw error;

    // Vrnemo lep, prijazen HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`
      <div style="font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; text-align: center; margin-top: 10%; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 40px 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <h1 style="color: #111827; font-size: 24px; margin-bottom: 10px;">Uspešno ste odjavljeni</h1>
          <p style="color: #4B5563; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
            Vaš e-mail naslov (<strong>${user.email}</strong>) je bil uspešno odstranjen z našega seznama. Dnevnega pregleda ne boste več prejemali.
          </p>
          <a href="https://krizisce.si" style="display: inline-block; padding: 12px 24px; background-color: #ea580c; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; transition: opacity 0.2s;">
            Nazaj na Križišče
          </a>
        </div>
      </div>
    `);
  } catch (e: any) {
    console.error("Unsubscribe Error:", e);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1 style="color: #ef4444;">Nekaj je šlo narobe</h1>
        <p>Povezava je morda že potekla ali pa ste se že odjavili. Prosimo, pišite nam na gjkcme@gmail.com.</p>
      </div>
    `);
  }
}
