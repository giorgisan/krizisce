import { GetServerSideProps } from 'next'
import { createClient } from '@supabase/supabase-js'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'

// Uporabimo SERVICE_ROLE_KEY, da varno zaobidemo RLS varnost v bazi in preberemo zadnji mail
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Props = {
  newsletter: {
    subject: string
    html_content: string
    created_at: string
  } | null
}

export default function PregledPage({ newsletter }: Props) {
  // Funkcija za lep slovenski izpis časa
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('sl-SI', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#0b101b]">
      <Head>
        <title>Dnevni pregled | Križišče</title>
        <meta name="description" content="Preberite najnovejši jutranji pregled ključnih novic portala Križišče." />
      </Head>

      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col">
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 dark:text-white mb-3">
            Dnevni pregled ☕
          </h1>
          {newsletter ? (
            <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
              Generirano: <span className="font-semibold text-brand">{formatDate(newsletter.created_at)}</span>
            </p>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">Poglejte si, kaj vsako jutro prejmejo naši naročniki.</p>
          )}
        </div>

        {newsletter ? (
          <>
            <div className="flex-1 w-full bg-white dark:bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200" style={{ minHeight: '800px' }}>
               {/* Uporabimo iframe za varen in natančen prikaz HTML-ja znotraj spletne strani */}
              <iframe 
                srcDoc={newsletter.html_content} 
                className="w-full h-full min-h-[800px] border-none"
                title={newsletter.subject}
              />
            </div>
            
            {/* NOVO: Gumb Nazaj na naslovnico na dnu */}
            <div className="mt-8 flex justify-center">
              <Link 
                href="/" 
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-700 shadow-sm text-base font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-[#151a25] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 -ml-1 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Nazaj na naslovnico
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-[#151a25] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400">Trenutno ni na voljo nobenega pregleda.</p>
          </div>
        )}

      </main>

      <Footer />
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  // Pridobimo absolutno zadnji vnos iz baze
  const { data, error } = await supabase
    .from('newsletters')
    .select('subject, html_content, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error("Napaka pri pridobivanju newsletterja:", error)
  }

  return {
    props: {
      newsletter: data || null
    }
  }
}
