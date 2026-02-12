/* pages/analiza.tsx */
import React from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { createClient } from '@supabase/supabase-js'

// Definicija tipov glede na nov API response
interface SourceItem {
  source: string;
  title: string;
  tone: string;
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

// Helper za logotipe (lahko uporabiš svojo obstoječo logiko ali tole poenostavljeno)
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
  return '/logo.png'; // Fallback
}

// Helper za barvo tona (manj vsiljivo)
const getToneStyle = (tone: string) => {
  const t = tone.toLowerCase();
  if (t.includes('senzacija') || t.includes('drama') || t.includes('alarm')) 
    return 'bg-red-50 text-red-600 border-red-100';
  if (t.includes('vprašal') || t.includes('provokat')) 
    return 'bg-orange-50 text-orange-600 border-orange-100';
  return 'bg-gray-50 text-gray-500 border-gray-100'; // Nevtralen/Informativen
}

export default function AnalizaPage({ analysis, lastUpdated }: Props) {
  
  return (
    <>
      <Head>
        <title>Medijski Monitor | Križišče</title>
        <meta name="description" content="Primerjava poročanja slovenskih medijev o istih temah." />
      </Head>

      <Header activeCategory="vse" activeSource="Vse" />

      <main className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900 pb-20">
        
        {/* Intro Section */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-12 px-4">
            <div className="max-w-4xl mx-auto text-center">
                <span className="inline-block py-1 px-3 rounded-full bg-brand/10 text-brand text-xs font-bold tracking-widest uppercase mb-4">
                    Beta Funkcija
                </span>
                <h1 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                    Medijski Monitor
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                    Kako se razlikujejo naslovnice, ko vsi poročajo o isti stvari? 
                    <br className="hidden md:block"/>
                    Primerjajte pristope različnih uredništev.
                </p>
                {lastUpdated && (
                    <div className="mt-6 text-xs text-gray-400 font-mono">
                        Zadnja analiza: {new Date(lastUpdated).toLocaleString('sl-SI', { 
                            day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' 
                        })}
                    </div>
                )}
            </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 mt-12 space-y-16">
          {!analysis || analysis.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
               <p className="text-gray-500">Trenutno ni na voljo nobene analize.</p>
            </div>
          ) : (
            analysis.map((item, idx) => (
              <section key={idx} className="group">
                  
                  {/* Naslov Teme */}
                  <div className="flex flex-col md:flex-row md:items-baseline gap-4 mb-6 px-2">
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                        {item.topic}
                      </h2>
                      <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1 relative top-[-6px] hidden md:block"></div>
                  </div>

                  {/* AI Povzetek & Razlika (Editorial Box) */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand"></div>
                      
                      <div className="flex gap-4 items-start">
                         <span className="text-2xl pt-1">💡</span>
                         <div>
                             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Bistvo & Razlike</h3>
                             <p className="text-gray-900 dark:text-gray-100 text-lg leading-relaxed font-medium mb-3">
                                {item.summary}
                             </p>
                             <p className="text-gray-600 dark:text-gray-400 text-base italic leading-relaxed">
                                "{item.tone_difference}"
                             </p>
                         </div>
                      </div>
                  </div>

                  {/* Primerjalna Mreža Naslovov */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {item.sources.map((source, sIdx) => (
                          <div key={sIdx} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand/30 transition-colors shadow-sm hover:shadow-md">
                              
                              {/* Vir & Logo */}
                              <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                      <div className="relative w-5 h-5 rounded-full overflow-hidden bg-gray-100">
                                         <Image 
                                            src={getLogoSrc(source.source)} 
                                            alt={source.source} 
                                            fill 
                                            className="object-cover"
                                            onError={(e) => { (e.target as any).src = '/logo.png' }}
                                         />
                                      </div>
                                      <span className="text-xs font-bold uppercase text-gray-500 tracking-wide">
                                          {source.source}
                                      </span>
                                  </div>
                                  
                                  {/* Ton Badge */}
                                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getToneStyle(source.tone)}`}>
                                      {source.tone}
                                  </span>
                              </div>

                              {/* Naslov */}
                              <h3 className="text-lg font-serif font-medium text-gray-900 dark:text-gray-100 leading-snug">
                                  {source.title}
                              </h3>
                          </div>
                      ))}
                  </div>

                  {/* Ločilna črta med temami (razen zadnje) */}
                  {idx < analysis.length - 1 && (
                      <div className="my-16 flex justify-center">
                          <div className="w-12 h-1 bg-gray-200 rounded-full"></div>
                      </div>
                  )}

              </section>
            ))
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

// ... getServerSideProps ostane ENAK kot prej, samo prekopiraj ga spodaj ...
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
