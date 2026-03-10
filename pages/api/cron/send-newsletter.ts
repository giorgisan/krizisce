import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(401).send('Nepooblaščen dostop.');
  }

  const newsletterId = req.query.id as string;
  if (!newsletterId) {
    return res.status(400).send('Manjka ID newsletterja.');
  }

  try {
    const { data: newsletter, error: fetchError } = await supabase
      .from('newsletters')
      .select('*')
      .eq('id', newsletterId)
      .single();

    if (fetchError || !newsletter) {
      return res.status(404).send('Newsletter ne obstaja.');
    }

    if (newsletter.status === 'sent') {
      return res.status(400).send('Ta newsletter je bil že poslan!');
    }

    // Tukaj je SPREMEMBA: Sedaj poleg emaila naberemo tudi 'id' (UUID)
    const { data: subscribers, error: subError } = await supabase
      .from('subscribers')
      .select('id, email')
      .eq('is_active', true);

    if (subError) throw subError;

    if (!subscribers || subscribers.length === 0) {
      return res.status(200).send('Ni aktivnih naročnikov za pošiljanje.');
    }

    // Tukaj zgradimo unikatne maile, kjer se {{USER_EMAIL}} zamenja s skritim {{USER_ID}}
    const emailsPayload = subscribers.map(sub => ({
      from: 'Križišče <jutro@krizisce.si>',
      replyTo: 'gjkcme@gmail.com',
      to: [sub.email],
      subject: newsletter.subject,
      // POPRAVEK: Zamenjaj USER_ID, da se ujema s tvojim HTML-jem
      html: newsletter.html_content.replace(/{{USER_ID}}/g, sub.id),
    }));

    const chunkSize = 100;
    for (let i = 0; i < emailsPayload.length; i += chunkSize) {
      const chunk = emailsPayload.slice(i, i + chunkSize);
      const { error: batchError } = await resend.batch.send(chunk);
      if (batchError) {
        console.error("Napaka pri pošiljanju paketa:", batchError);
      }
    }

    const { error: updateError } = await supabase
      .from('newsletters')
      .update({ status: 'sent' })
      .eq('id', newsletterId);

    if (updateError) throw updateError;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1 style="color: #10b981;">✅ Uspešno razposlano!</h1>
        <p>Današnji Jutranji pregled je bil uspešno poslan <strong>${subscribers.length}</strong> naročnikom.</p>
        <a href="https://krizisce.si" style="color: #ea580c; text-decoration: none;">Nazaj na Križišče</a>
      </div>
    `);

  } catch (error: any) {
    console.error("Critical Send Error:", error);
    return res.status(500).send(`Prišlo je do sistemske napake: ${error.message}`);
  }
}
