import { GetServerSideProps } from 'next'
import { createClient } from '@supabase/supabase-js'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useRef } from 'react'

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
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  // NOVA UX REŠITEV: Avtomatsko prilagajanje višine iframe-a, da preprečimo dvojni scroll
  const handleIframeLoad = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        const doc = iframeRef.current.contentWindow.document;
        // Majhen zamik, da se naložijo slike znotraj iframe-a
        setTimeout(() => {
            const height = doc.documentElement.scrollHeight;
            iframeRef.current!.style.height = `${height + 30}px`;
        }, 300);
      } catch (e) {
        console.error("Ne morem prebrati višine iframe-a", e);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#0b101b]">
      <Head>
        <title>Dnevni pregled | Križišče</title>
        <meta name="description" content="Preberite najnovejši jutranji pregled ključnih novic portala Križišče." />
        <style>{`html { scroll-behavior: smooth; }`}</style>
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
            {/* OVOJ BREZ OVERFLOWA, DA SE LAHKO RAZTEGNE */}
            <div className="flex-1 w-full bg-white dark:bg-white rounded-2xl shadow-xl border border-gray-200 transition-all duration-500">
              <iframe 
                ref={iframeRef}
                srcDoc={newsletter.html_content} 
                className="w-full border-none"
                style={{ minHeight: '60vh' }}
                title={newsletter.subject}
                scrolling="no" // SKRITO DRSENJE - drsi se celotna stran!
                onLoad={handleIframeLoad}
              />
            </div>
            
            {/* Akcijski gumbi - Prikazani takoj po koncu branja */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="#narocnina" 
                className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3.5 shadow-lg shadow-brand/20 text-base font-bold rounded-xl text-white bg-orange-700 hover:bg-brand transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Naročite se brezplačno
              </Link>
              
              <Link 
                href="/" 
                className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3.5 border border-gray-300 dark:border-gray-700 shadow-sm text-base font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-[#151a25] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Nazaj na novice
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
  const { data, error } = await supabase
    .from('newsletters')
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
