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

      <main className="min-h-screen bg-gray-50/50 dark:bg-[#0a0a0a] pb-24">
        
        {/* Naslovna vrstica - zožana na max-w-5xl */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-8 px-4">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white flex items-center justify-center md:justify-start gap-3">
                        <span className="text-2xl">⚖️</span> Medijski Monitor
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-normal">
                        Dnevna AI analiza uredniškega okvirjanja v slovenskih medijih
                    </p>
                </div>
                {lastUpdated && (
                    <div className="text-[11px] font-mono font-medium text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-700">
                        {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                )}
            </div>
        </div>

        {/* GLAVNO TELO: CSS Grid, Max-W-5xl (bolj kompaktno) */}
        <div className="max-w-5xl mx-auto px-4 mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {validAnalysis.length === 0 ? (
            <div className="md:col-span-2 text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
               <p className="text-gray-500 font-normal">Analiza se pripravlja ...</p>
               {debugStr && (
                   <div className="mt-4 p-4 mx-auto max-w-xl bg-red-50 dark:bg-red-900/10 text-red-800 text-[11px] font-mono text-left rounded">
                       {debugStr}
                   </div>
               )}
            </div>
          ) : (
            validAnalysis.map((item, idx) => (
              <article key={idx} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200/60 dark:border-gray-800 overflow-hidden flex flex-col">
                  
                  {/* SLIKA (16:9) */}
                  {item.main_image && (
                      <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 relative">
                          <img 
                            src={proxiedImage(item.main_image, 640, 360, 1)} 
                            alt={item.topic}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                      </div>
                  )}

                  {/* VSEBINA */}
                  <div className="p-6 md:p-7 flex flex-col gap-6">
                      
                      {/* Naslov in povzetek - manj bold, več zraka */}
                      <div>
                          <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-2 leading-snug">
                            {item.topic}
                          </h2>
                          <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-relaxed">
                            {item.summary}
                          </p>
                      </div>
                      
                      {/* AI Framing Analiza - prefinjena škatla */}
                      <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 p-4 rounded-lg">
                          <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-brand">Uredniški okvir</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 font-normal leading-relaxed">
                             {item.framing_analysis || item.tone_difference || "Ni na voljo"}
                          </p>
                      </div>

                      {/* Seznam Virov - minimalističen seznam */}
                      <div>
                          <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3 px-1">Primerjani viri</div>
                          <div className="flex flex-col gap-1">
                              {item.sources && item.sources.map((source, sIdx) => (
                                  <button 
                                    key={sIdx}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setPreviewUrl(source.url); 
                                    }}
                                    className="text-left group flex items-start gap-3 p-2 -mx-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                                  >
                                      {/* Logo (manjši) */}
                                      <div className="relative w-6 h-6 mt-0.5 flex-shrink-0 rounded-full overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                          <Image src={getLogoSrc(source.source)} alt={source.source} fill className="object-contain p-0.5" />
                                      </div>

                                      <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-0.5">
                                              <span className="text-xs font-semibold text-gray-900 dark:text-gray-200">
                                                  {source.source}
                                              </span>
                                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${getToneColor(source.tone)}`}>
                                                  {source.tone}
                                              </span>
                                          </div>
                                          <h3 className="text-xs font-normal text-gray-600 dark:text-gray-400 line-clamp-2 group-hover:text-brand transition-colors">
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
