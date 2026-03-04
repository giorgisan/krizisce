import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Potrebujemo service key, da zapišemo v bazo
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Dovolimo samo POST requeste
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  // Enostavna validacija email naslova
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Prosimo, vnesite veljaven email naslov.' });
  }

  try {
    const { error } = await supabase
      .from('subscribers')
      .insert([{ email }]);

    if (error) {
      // Napaka 23505 v Postgresu pomeni, da vnos že obstaja (zaradi UNIQUE omejitve)
      if (error.code === '23505') {
        return res.status(200).json({ message: 'Ta email je že prijavljen na naše novice!' });
      }
      throw error;
    }

    return res.status(200).json({ message: 'Hvala za prijavo! Vaš email je uspešno dodan.' });
  } catch (e: any) {
    console.error('Napaka pri prijavi na novice:', e);
    return res.status(500).json({ error: 'Nekaj je šlo narobe. Prosimo, poskusite znova kasneje.' });
  }
}
