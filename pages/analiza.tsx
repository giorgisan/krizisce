/* pages/analiza.tsx */
import React from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image' 
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { createClient } from '@supabase/supabase-js'

interface SourceItem {
  source: string;
  title: string;
  tone: string;
  url: string; 
}

interface AnalysisItem {
  topic: string;
  summary: string;
  framing_analysis?: string; 
  tone_difference?: string; 
  main_image?: string; 
  sources: SourceItem[];
}

interface Props {
  analysis: AnalysisItem[] | null;
  lastUpdated: string | null;
  debugStr?: string | null; // Novo polje za pomoč pri iskanju napak
}

const getLogoSrc = (sourceName: string) => {
  const s = sourceName.toLowerCase().replace(/\s/g, '').replace(/\./g, '');
  if (s.includes('rtv')) return '/logos/rtvslo.png';
  if (s.includes('24ur')) return '/logos/24ur.png';
  if (s.includes('siol')) return '/logos/siol.png';
  if (s.includes('delo')) return '/logos/delo.png';
  if (s.includes('dnevnik')) return '/logos/dnevnik.png';
  if (s.includes('slovenske')) return '/logos/slovenskenovice.png';
  if (s.includes('večer')) return '/logos/vecer.png';
  if (s.includes('n1')) return '/logos/n1.png';
  if (s.includes('svet24')) return '/logos/svet24.png';
  if (s.includes('zurnal')) return '/logos/zurnal24.png';
  return '/logo.png';
}

const getToneColor = (tone: string) => {
  const t = tone.toLowerCase();
  if (t.includes('senzacija') || t.includes('drama') || t.includes('alarm')) return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50';
  if (t.includes('vprašal') || t.includes('provokat')) return 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50';
  return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
}

export default function AnalizaPage({ analysis, lastUpdated, debugStr }: Props) {
  // Preverimo, da je analysis dejansko pravi niz (array) preden ga mapiramo
  const validAnalysis = Array.isArray(analysis) ? analysis : [];

  return (
    <>
      <Head>
        <title>Medijski Monitor | Križišče</title>
      </Head>

      <Header activeCategory="vse" activeSource="Vse" />

      <main className="min-h-screen bg-gray-50 dark:bg-black pb-20">
        
        {/* Naslovna vrstica */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-8 px-4">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="text-3xl">⚖️</span> Medijski Monitor
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Primerjava poročanja slovenskih medijev o istih temah (AI Analiza)
                    </p>
                </div>
                {lastUpdated && (
                    <div className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                        Zadnjič osveženo: {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                )}
            </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 mt-8 space-y-12">
          {validAnalysis.length === 0 ? (
            <div className="text-center py-20 px-4 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
               <p className="text-gray-500 mb-2">Analiza se pripravlja ...</p>
               {!analysis && <p className="text-xs text-red-400">Podatki iz baze niso na voljo v pričakovanem formatu.</p>}
               
               {/* DEBUG OKNO - prikaže se samo, če gre nekaj narobe z branjem iz baze */}
               {debugStr && (
                   <div className="mt-6 p-4 mx-auto max-w-2xl bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300 rounded-md text-[11px] font-mono break-words text-left h-64 overflow-y-auto border border-red-200 dark:border-red-800">
                       <strong className="block mb-2">Sistemski izpis baze (Debug):</strong>
                       {debugStr}
                   </div>
               )}
            </div>
          ) : (
            validAnalysis.map((item, idx) => (
              <article key={idx} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow">
                  
                  {/* ZGORNJI DEL: Split View */}
                  <div className="flex flex-col md:flex-row min-h-[280px]">
                      
                      {/* 1. SLIKA (LEVO) - 40% širine */}
                      <div className="w-full md:w-5/12 relative h-56 md:h-auto bg-gray-200 dark:bg-gray-800 overflow-hidden">
                          {item.main_image ? (
                              <img 
                                src={item.main_image} 
                                alt={item.topic}
                                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                  <span className="text-4xl opacity-20">📰</span>
                              </div>
                          )}
                          <div className="hidden w-full h-full absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                               <span className="text-4xl opacity-20">📰</span>
                          </div>
                          
                          <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-black/80 backdrop-blur-sm text-gray-900 dark:text-white text-xs font-bold px-3 py-1 rounded-full border border-black/5">
                              {item.sources ? item.sources.length : 0} virov
                          </div>
                      </div>

                      {/* 2. VSEBINA (DESNO) - 60% širine */}
                      <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col justify-center bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800">
                          <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-3 leading-tight">
                            {item.topic}
                          </h2>
                          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6 font-medium">
                            {item.summary}
                          </p>
                          
                          <div className="mt-auto bg-brand/5 dark:bg-brand/10 border-l-4 border-brand p-4 rounded-r-md">
                              <div className="flex items-center gap-2 mb-2 opacity-80">
                                  <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                  <span className="text-xs font-bold uppercase tracking-wider text-brand">Uredniški okvir (Framing)</span>
                              </div>
                              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-snug">
                                 {item.framing_analysis || item.tone_difference || "Ni na voljo"}
                              </p>
                          </div>
                      </div>
                  </div>

                  {/* SPODNJI DEL: Grid Virov */}
                  <div className="bg-gray-50/50 dark:bg-black/20 p-4 md:p-6 border-t border-gray-100 dark:border-gray-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {item.sources && item.sources.map((source, sIdx) => (
                              <Link 
                                href={source.url || '#'} 
                                target="_blank"
                                key={sIdx} 
                                className="group bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand/40 hover:shadow-sm transition-all flex items-start gap-4"
                              >
                                  <div className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                      <Image src={getLogoSrc(source.source)} alt={source.source} fill className="object-contain p-0.5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                          <span className="text-[10px] font-bold uppercase text-gray-400">
                                              {source.source}
                                          </span>
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded-sm border font-semibold tracking-wide ${getToneColor(source.tone)}`}>
                                              {source.tone}
                                          </span>
                                      </div>
                                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug group-hover:text-brand transition-colors line-clamp-2">
                                          {source.title}
                                      </h3>
                                  </div>
                              </Link>
                          ))}
                      </div>
                  </div>
              </article>
            ))
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Izklopimo cache za testiranje (1 sekunda), da ti takoj osveži stran!
  res.setHeader('Cache-Control', 'public, s-maxage=1, stale-while-revalidate=10')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const { data, error } = await supabase
    .from('media_analysis')
    .select('data, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
      return { props: { analysis: null, lastUpdated: null, debugStr: error ? error.message : 'Baza je prazna.' } }
  }

  let extractedAnalysis = null;
  let rawContent = data.data;

  // 1. Zavarujemo se pred DVOJNIM stringify formatom iz Supabase
  if (typeof rawContent === 'string') {
      try { rawContent = JSON.parse(rawContent); } catch(e) {}
  }
  // Včasih se to zgodi dvakrat, ponovimo:
  if (typeof rawContent === 'string') {
      try { rawContent = JSON.parse(rawContent); } catch(e) {}
  }

  // 2. Izvlečemo array
  if (Array.isArray(rawContent)) {
      extractedAnalysis = rawContent;
  } else if (rawContent && typeof rawContent === 'object') {
      if (Array.isArray(rawContent.data)) {
          extractedAnalysis = rawContent.data;
      } else {
          for (const key of Object.keys(rawContent)) {
              if (Array.isArray(rawContent[key])) {
                  extractedAnalysis = rawContent[key];
                  break;
              }
          }
      }
  }

  // Če je po vsem tem še vedno null, pošljemo na ekran surovi tekst, da vidiva zakaj
  const debugString = !extractedAnalysis ? JSON.stringify(data.data, null, 2) : null;

  return { 
    props: { 
        analysis: extractedAnalysis, 
        lastUpdated: data.created_at,
        debugStr: debugString
    } 
  }
}
