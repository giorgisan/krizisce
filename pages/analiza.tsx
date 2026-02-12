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
  tone_difference: string;
  main_image?: string; // Novo polje za sliko
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
  if (t.includes('senzacija') || t.includes('drama') || t.includes('alarm')) return 'bg-red-50 text-red-600 border-red-100';
  if (t.includes('vprašal') || t.includes('provokat')) return 'bg-orange-50 text-orange-600 border-orange-100';
  return 'bg-gray-50 text-gray-500 border-gray-100';
}

export default function AnalizaPage({ analysis, lastUpdated }: Props) {
  return (
    <>
      <Head>
        <title>Medijski Monitor | Križišče</title>
      </Head>

      <Header activeCategory="vse" activeSource="Vse" />

      <main className="min-h-screen bg-gray-50 dark:bg-black pb-20">
        
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-8 px-4">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="text-3xl">⚖️</span> Medijski Monitor
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Primerjava poročanja slovenskih medijev o istih temah
                    </p>
                </div>
                {lastUpdated && (
                    <div className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                        {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                )}
            </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 mt-8 space-y-12">
          {!analysis || analysis.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
               <p className="text-gray-500">Analiza se pripravlja ...</p>
            </div>
          ) : (
            analysis.map((item, idx) => (
              <article key={idx} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow">
                  
                  {/* ZGORNJI DEL: Split View (Tekst levo, Slika desno) */}
                  <div className="grid md:grid-cols-12 gap-0 min-h-[250px]">
                      
                      {/* Leva stran: Vsebina */}
                      <div className="md:col-span-7 p-6 md:p-10 flex flex-col justify-center">
                          <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-3 leading-tight">
                            {item.topic}
                          </h2>
                          <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed mb-5">
                            {item.summary}
                          </p>
                          
                          {/* Tone Box */}
                          <div className="bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-400 p-4 rounded-r-sm">
                              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium italic leading-snug">
                                 " {item.tone_difference} "
                              </p>
                          </div>
                      </div>

                      {/* Desna stran: SLIKA (Namesto statistike) */}
                      <div className="md:col-span-5 relative h-48 md:h-auto bg-gray-200 dark:bg-gray-800">
                          {item.main_image ? (
                              <Image 
                                src={item.main_image} 
                                alt={item.topic}
                                fill
                                className="object-cover"
                                unoptimized={true} // Za vsak slučaj, če so zunanji URLji
                              />
                          ) : (
                              // Fallback če ni slike (vzorec)
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                  <span className="text-3xl opacity-20">📰</span>
                              </div>
                          )}
                          
                          {/* Števec virov čez sliko */}
                          <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20">
                              {item.sources.length} virov
                          </div>
                      </div>
                  </div>

                  {/* SPODNJI DEL: Grid Virov */}
                  <div className="bg-gray-50/50 dark:bg-black/20 p-4 md:p-6 border-t border-gray-100 dark:border-gray-800">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {item.sources.map((source, sIdx) => (
                              <Link 
                                href={source.url || '#'} 
                                target="_blank"
                                key={sIdx} 
                                className="group bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand/40 hover:shadow-sm transition-all flex flex-col justify-between h-full"
                              >
                                  <div>
                                      <div className="flex items-center justify-between mb-2.5">
                                          <div className="flex items-center gap-2">
                                              <div className="relative w-5 h-5 opacity-90">
                                                  <Image src={getLogoSrc(source.source)} alt={source.source} fill className="object-contain" />
                                              </div>
                                              <span className="text-[10px] font-bold uppercase text-gray-500 truncate max-w-[100px]">
                                                  {source.source}
                                              </span>
                                          </div>
                                          <span className={`text-[9px] px-2 py-0.5 rounded-full border ${getToneColor(source.tone)} font-semibold`}>
                                              {source.tone}
                                          </span>
                                      </div>
                                      
                                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200 leading-snug group-hover:text-brand transition-colors line-clamp-3">
                                          {source.title}
                                      </h3>
                                  </div>
                                  
                                  <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-700 flex items-center justify-end text-[10px] text-gray-400 group-hover:text-brand font-bold uppercase tracking-wider transition-colors">
                                      Preberi →
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
