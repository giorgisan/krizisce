import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, agreed } = req.body;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Prosimo, vnesite veljaven email naslov.' });
  }
  
  if (!agreed) {
    return res.status(400).json({ error: 'Za prijavo se morate strinjati s pogoji.' });
  }

  try {
    const { error } = await supabase
      .from('subscribers')
      .insert([{ email }]); // Tvoja tabela že ima is_active = true by default

    if (error) {
      if (error.code === '23505') { // Postgres koda za UNIQUE kršitev
        return res.status(200).json({ message: 'Ta email je že prijavljen na naše novice!' });
      }
      throw error;
    }

    return res.status(200).json({ message: 'Hvala za prijavo! Uspešno ste dodani na seznam.' });
  } catch (e: any) {
    console.error('Napaka pri prijavi:', e);
    return res.status(500).json({ error: 'Nekaj je šlo narobe. Prosimo, poskusite znova.' });
  }
}
