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

// Dinamični uvoz predogleda (enako kot na prvi strani)
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
  if (t.includes('senzacija') || t.includes('drama') || t.includes('alarm')) return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50';
  if (t.includes('vprašal') || t.includes('provokat')) return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50';
  return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
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

      <main className="min-h-screen bg-gray-50 dark:bg-black pb-20">
        
        {/* Naslovna vrstica - Zelo kompaktna */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-6 px-4">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="text-2xl">⚖️</span> Medijski Monitor
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        AI analiza uredniškega okvirjanja v slovenskih medijih
                    </p>
                </div>
                {lastUpdated && (
                    <div className="text-[11px] font-mono font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700">
                        Zadnja osvežitev: {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                )}
            </div>
        </div>

        {/* GLAVNO TELO: Masonry CSS Grid (2 stolpca) */}
        <div className="max-w-[1600px] mx-auto px-4 mt-6 columns-1 lg:columns-2 gap-6">
          {validAnalysis.length === 0 ? (
            <div className="break-inside-avoid text-center py-20 px-4 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
               <p className="text-gray-500 mb-2 font-medium">Analiza se pripravlja ...</p>
               {debugStr && (
                   <div className="mt-6 p-4 mx-auto max-w-2xl bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300 rounded-md text-[11px] font-mono break-words text-left overflow-y-auto border border-red-200 dark:border-red-800">
                       <strong className="block mb-2">Sistemski izpis baze (Debug):</strong>
                       {debugStr}
                   </div>
               )}
            </div>
          ) : (
            validAnalysis.map((item, idx) => (
              <article key={idx} className="break-inside-avoid mb-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col group">
                  
                  {/* SLIKA (Zgoraj, formatirana) */}
                  {item.main_image && (
                      <div className="w-full relative aspect-[21/9] bg-gray-200 dark:bg-gray-800 overflow-hidden">
                          <img 
                            // Uporabimo proxiedImage za prikaz brez CORS napak!
                            src={proxiedImage(item.main_image, 800, 400, 1)} 
                            alt={item.topic}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-md border border-white/10">
                              {item.sources ? item.sources.length : 0} virov
                          </div>
                      </div>
                  )}

                  {/* VSEBINA (Spodaj) */}
                  <div className="p-5 md:p-7 flex flex-col gap-5">
                      
                      {/* Naslov in povzetek */}
                      <div>
                          <h2 className="text-xl md:text-2xl font-serif font-extrabold text-gray-900 dark:text-white mb-2 leading-tight group-hover:text-brand transition-colors">
                            {item.topic}
                          </h2>
                          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed font-medium">
                            {item.summary}
                          </p>
                      </div>
                      
                      {/* AI Framing Analiza */}
                      <div className="bg-brand/5 dark:bg-brand/10 border-l-4 border-brand p-4 rounded-r-lg">
                          <div className="flex items-center gap-1.5 mb-2">
                              <svg className="w-3.5 h-3.5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-brand">Uredniški okvir (AI Framing)</span>
                          </div>
                          <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
                             {item.framing_analysis || item.tone_difference || "Ni na voljo"}
                          </p>
                      </div>

                      {/* Seznam Virov - Kompaktni gumbi s predogledom */}
                      <div className="mt-2 space-y-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Primerjani viri:</div>
                          <div className="grid grid-cols-1 gap-2">
                              {item.sources && item.sources.map((source, sIdx) => (
                                  <button 
                                    key={sIdx}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setPreviewUrl(source.url); // Odpre predogled!
                                    }}
                                    className="w-full text-left bg-gray-50/80 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-brand/30 hover:shadow-sm transition-all flex items-center gap-3"
                                  >
                                      {/* Logo */}
                                      <div className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm">
                                          <Image src={getLogoSrc(source.source)} alt={source.source} fill className="object-contain p-1" />
                                      </div>

                                      <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-0.5">
                                              <span className="text-[11px] font-bold text-gray-900 dark:text-white">
                                                  {source.source}
                                              </span>
                                              <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${getToneColor(source.tone)}`}>
                                                  {source.tone}
                                              </span>
                                          </div>
                                          <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 line-clamp-1">
                                              {source.title}
                                          </h3>
                                      </div>
                                  </button>
                              ))}
                          </div>
                      </div>

                  </div>
              </article>
            ))
          )}
        </div>
      </main>

      {/* --- PREDOGLED NOVICE (Preview Modal) --- */}
      {previewUrl && (
        <ArticlePreview 
            url={previewUrl} 
            onClose={() => setPreviewUrl(null)} 
        />
      )}

      <Footer />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Vrnil sem cache na normalno raven (60 sekund)
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
  if (typeof rawContent === 'string') {
      try { rawContent = JSON.parse(rawContent); } catch(e) {}
  }

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

  return { 
    props: { 
        analysis: extractedAnalysis, 
        lastUpdated: row.created_at,
        debugStr: !extractedAnalysis ? JSON.stringify(row.data, null, 2) : null
    } 
  }
}
