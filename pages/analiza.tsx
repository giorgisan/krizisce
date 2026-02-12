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
  url: string; // Dodan URL
}

interface AnalysisItem {
  topic: string;
  summary: string;
  tone_difference: string;
  sources: SourceItem[];
}

interface Props {
  analysis: AnalysisItem[] | null;
  lastUpdated: string | null;
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
  if (t.includes('senzacija') || t.includes('drama') || t.includes('alarm')) return 'bg-red-100 text-red-700 border-red-200';
  if (t.includes('vprašal') || t.includes('provokat')) return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

export default function AnalizaPage({ analysis, lastUpdated }: Props) {
  return (
    <>
      <Head>
        <title>Medijski Monitor | Križišče</title>
      </Head>

      <Header activeCategory="vse" activeSource="Vse" />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
        
        {/* Compact Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-8 px-4">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="text-3xl">⚖️</span> Medijski Monitor
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Primerjava poročanja o istih temah
                    </p>
                </div>
                {lastUpdated && (
                    <div className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                        Posodobljeno: {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                )}
            </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
          {!analysis || analysis.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
               <p className="text-gray-500">Analiza se pripravlja ...</p>
            </div>
          ) : (
            analysis.map((item, idx) => (
              <article key={idx} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                  
                  {/* ZGORNJI DEL: Tema in Povzetek (Split View) */}
                  <div className="grid md:grid-cols-12 gap-0">
                      
                      {/* Leva stran: Naslov in Bistvo */}
                      <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-center">
                          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
                            {item.topic}
                          </h2>
                          <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed mb-4">
                            {item.summary}
                          </p>
                          
                          {/* AI Insight Box */}
                          <div className="bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-400 p-3 rounded-r-md">
                              <p className="text-sm text-blue-800 dark:text-blue-200 italic">
                                 " {item.tone_difference} "
                              </p>
                          </div>
                      </div>

                      {/* Desna stran (Statistika ali prazno za zdaj - lahko dodamo graf) */}
                      <div className="md:col-span-5 bg-gray-50 dark:bg-gray-800/50 p-6 md:p-8 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                          <div className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-wider">Viri poročanja</div>
                          <div className="flex flex-wrap gap-2">
                              {item.sources.map((src, i) => (
                                  <div key={i} className="relative w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200 overflow-hidden" title={src.source}>
                                      <Image 
                                        src={getLogoSrc(src.source)} 
                                        alt={src.source} 
                                        fill 
                                        className="object-contain p-0.5"
                                        onError={(e) => { (e.target as any).src = '/logo.png' }}
                                      />
                                  </div>
                              ))}
                              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                                {item.sources.length}
                              </span>
                          </div>
                      </div>
                  </div>

                  {/* SPODNJI DEL: Grid Virov (Kompaktne kartice) */}
                  <div className="bg-gray-50 dark:bg-black/20 p-4 md:p-6 border-t border-gray-100 dark:border-gray-800">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {item.sources.map((source, sIdx) => (
                              <Link 
                                href={source.url || '#'} 
                                target="_blank"
                                key={sIdx} 
                                className="group bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand/50 hover:shadow-md transition-all flex flex-col justify-between h-full"
                              >
                                  <div>
                                      <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-1.5">
                                              <div className="relative w-4 h-4">
                                                  <Image src={getLogoSrc(source.source)} alt={source.source} fill className="object-contain" />
                                              </div>
                                              <span className="text-[10px] font-bold uppercase text-gray-500 truncate max-w-[80px]">
                                                  {source.source}
                                              </span>
                                          </div>
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getToneColor(source.tone)}`}>
                                              {source.tone}
                                          </span>
                                      </div>
                                      
                                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200 leading-snug group-hover:text-brand transition-colors line-clamp-3">
                                          {source.title}
                                      </h3>
                                  </div>
                                  
                                  <div className="mt-3 pt-2 border-t border-gray-50 dark:border-gray-700 flex items-center text-xs text-gray-400 group-hover:text-brand font-medium">
                                      Preberi članek →
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
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const { data, error } = await supabase
    .from('media_analysis')
    .select('data, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return { props: { analysis: null, lastUpdated: null } }

  return { props: { analysis: data.data, lastUpdated: data.created_at } }
}
