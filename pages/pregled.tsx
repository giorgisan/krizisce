import { GetServerSideProps } from 'next'
import { createClient } from '@supabase/supabase-js'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'

// Inicializacija Supabase (samo za branje)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Props = {
  newsletter: {
    subject: string
    html_content: string
    created_at: string
  } | null
}

export default function PregledPage({ newsletter }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#0b101b]">
      <Head>
        <title>Dnevni pregled | Križišče</title>
        <meta name="description" content="Preberite najnovejši jutranji pregled ključnih novic." />
      </Head>

      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col">
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 dark:text-white mb-3">
            Zadnji Dnevni Pregled ☕
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Poglejte si, kaj vsako jutro prejmejo naši naročniki.
          </p>
        </div>

        {newsletter ? (
          <div className="flex-1 w-full bg-white dark:bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
             {/* Iframe uporabimo, da se e-mail HTML (ki uporablja tabele in inline CSS) 
                prikaže popolnoma varno in ne vpliva na preostanek strani.
             */}
            <iframe 
              srcDoc={newsletter.html_content} 
              className="w-full h-[800px] border-none"
              title={newsletter.subject}
            />
          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-[#151a25] rounded-xl border border-gray-200 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400">Trenutno ni na voljo nobenega pregleda.</p>
          </div>
        )}

      </main>

      <Footer />
    </div>
  )
}

// Tukaj pridobimo zadnji poslani newsletter iz baze še preden se stran naloži
export const getServerSideProps: GetServerSideProps = async () => {
  const { data, error } = await supabase
    .from('newsletters')
    // ZA PRODUKCIJO: .eq('status', 'sent') 
    // Za zdaj, dokler testirava, vzamiva kar kateregakoli (tudi 'draft')
    .select('subject, html_content, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return {
    props: {
      newsletter: data || null
    }
  }
}
