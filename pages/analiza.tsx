/* pages/analiza.tsx */
import React, { useState, ComponentType } from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Image from 'next/image' 
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { createClient } from '@supabase/supabase-js'
import { proxiedImage } from '@/lib/img'

type PreviewProps = { url: string; onClose: () => void }
const ArticlePreview = dynamic(() => import('@/components/ArticlePreview'), {
  ssr: false,
}) as ComponentType<PreviewProps>

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
  debugStr?: string | null;
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
  if (t.includes('senzacija') || t.includes('drama') || t.includes('alarm')) return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400';
  if (t.includes('vprašal') || t.includes('provokat')) return 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400';
  return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
}

export default function AnalizaPage({ analysis, lastUpdated, debugStr }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const validAnalysis = Array.isArray(analysis) ? analysis : [];

  return (
    <>
      <Head>
        <title>Medijski Monitor | Križišče</title>
      </Head>

      <Header activeCategory="vse" activeSource="Vse" />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        
        {/* NASLOVNA VRSTICA - Omejena na max-w-5xl za boljšo sredinsko poravnavo */}
        <div className="bg-white dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 py-8 px-4">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="text-2xl">⚖️</span> Medijski Monitor
                    </h1>
                    {lastUpdated && (
                        <div className="text-[11px] font-mono font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 animate-ping"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand"></span>
                            </span>
                            Zadnja osvežitev: {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 max-w-2xl leading-relaxed">
                    <strong>Transparentna AI analiza:</strong> Sistem vsakih 30 minut zajame 800 najnovejših novic (identično kot za Aktualno), jih s pomočjo Gemini 2.5 Flash modela grupira in analizira uredniške poudarke.
                </p>
            </div>
        </div>

        {/* GLAVNO TELO: Omejeno na 5xl, 2 stolpca na desktopu */}
        <div className="max-w-5xl mx-auto px-4 mt-8 md:columns-2 gap-6 space-y-6">
          {validAnalysis.length === 0 ? (
            <div className="break-inside-avoid text-center py-20 bg-white dark:bg-gray-800/40 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 w-full">
               <p className="text-gray-500 font-medium">Analiza se pripravlja ...</p>
            </div>
          ) : (
            validAnalysis.map((item, idx) => (
              <article key={idx} className="break-inside-avoid inline-block w-full bg-white dark:bg-gray-800/40 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800/80 overflow-hidden mb-6">
                  
                  {/* SLIKA: Povečana in fiksna na 16:9 */}
                  {item.main_image && (
                      <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 relative border-b border-gray-100 dark:border-gray-800/50">
                          <img 
                            src={proxiedImage(item.main_image, 800, 450, 1)} 
                            alt={item.topic}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                      </div>
                  )}

                  {/* VSEBINA: Bolj berljiva pisava in razmaki */}
                  <div className="p-5 md:p-6 flex flex-col gap-5">
                      
                      <div>
                          <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                            {item.topic}
                          </h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-normal leading-relaxed">
                            {item.summary}
                          </p>
                      </div>
                      
                      {/* AI Framing Analiza */}
                      <div className="bg-brand/5 border-l-4 border-brand p-4 rounded-r-lg">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-brand mb-1.5">
                              Uredniški okvir
                          </div>
                          <p className="text-[13px] text-gray-800 dark:text-gray-200 font-medium leading-relaxed italic">
                             "{item.framing_analysis || item.tone_difference || "Ni na voljo"}"
                          </p>
                      </div>

                      {/* Seznam Virov - Kompakten a berljiv */}
                      <div className="mt-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">Primerjani viri</div>
                          <div className="flex flex-col border-t border-gray-100 dark:border-gray-800/50">
                              {item.sources && item.sources.map((source, sIdx) => (
                                  <div 
                                    key={sIdx} 
                                    className="group relative flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 hover:bg-gray-50 dark:hover:bg-gray-800/80 rounded-xl transition-colors"
                                  >
                                      <a 
                                        href={source.url || '#'} 
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 min-w-0 flex-1 pr-8"
                                      >
                                          {/* Logo - Kvadraten z robovi */}
                                          <div className="relative w-5 h-5 shrink-0 rounded-[4px] overflow-hidden bg-white border border-gray-100 dark:border-gray-700 shadow-sm">
                                              <Image src={getLogoSrc(source.source)} alt={source.source} fill className="object-contain p-0.5" />
                                          </div>
                                          
                                          <div className="flex flex-col min-w-0">
                                              <div className="flex items-center gap-2">
                                                  <span className="text-[10px] font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">
                                                      {source.source}
                                                  </span>
                                                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${getToneColor(source.tone)}`}>
                                                      {source.tone}
                                                  </span>
                                              </div>
                                              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 truncate group-hover:text-brand transition-colors mt-0.5">
                                                  {source.title}
                                              </span>
                                          </div>
                                      </a>

                                      {/* OKO - Hitri predogled (Vidno na hover) */}
                                      <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setPreviewUrl(source.url); 
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand/10 rounded-full transition-all shrink-0 opacity-0 group-hover:opacity-100"
                                      >
                                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                                              <circle cx="12" cy="12" r="3" />
                                          </svg>
                                      </button>
                                  </div>
                              ))}
                          </div>
                      </div>

                  </div>
              </article>
            ))
          )}
        </div>
      </main>

      {/* PREDOGLED NOVICE */}
      {previewUrl && (
        <ArticlePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      <Footer />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const { data, error } = await supabase
    .from('media_analysis')
    .select('data, created_at')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) {
      return { props: { analysis: null, lastUpdated: null, debugStr: error ? error.message : 'Baza je prazna.' } }
  }

  const row = data[0];
  let extractedAnalysis = null;
  let rawContent = row.data;

  if (typeof rawContent === 'string') {
      try { rawContent = JSON.parse(rawContent); } catch(e) {}
  }
  if (Array.isArray(rawContent)) {
      extractedAnalysis = rawContent;
  } else if (rawContent && typeof rawContent === 'object' && Array.isArray(rawContent.data)) {
      extractedAnalysis = rawContent.data;
  }

  return { 
    props: { 
        analysis: extractedAnalysis, 
        lastUpdated: row.created_at,
        debugStr: !extractedAnalysis ? JSON.stringify(row.data, null, 2) : null
    } 
  }
}
