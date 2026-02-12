/* pages/analiza.tsx */
import React from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { createClient } from '@supabase/supabase-js'

interface AnalysisItem {
  topic: string;
  clickbait_score: number;
  sensationalism: string;
  comparison: string;
  best_headline: string;
  worst_headline: string | null;
}

interface Props {
  analysis: AnalysisItem[] | null;
  lastUpdated: string | null;
}

export default function AnalizaPage({ analysis, lastUpdated }: Props) {
  
  // Funkcija za barvo score-a
  const getScoreColor = (score: number) => {
    if (score < 3) return 'bg-green-100 text-green-700 border-green-200';
    if (score < 6) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (score < 8) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-red-100 text-red-700 border-red-200';
  }

  return (
    <>
      <Head>
        <title>Analiza Medijev | Križišče</title>
        <meta name="description" content="AI analiza poročanja slovenskih medijev. Kdo je objektiven in kdo senzacionalističen?" />
      </Head>

      {/* Header - poenostavljen, brez filtrov, ker smo na podstrani */}
      <Header 
         activeCategory="vse" 
         activeSource="Vse" 
         onOpenFilter={() => {}} 
         onSearch={() => {}} 
         onSelectCategory={() => {}} 
         onReset={() => {}}
      />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-2">
              <span className="text-brand">AI</span> ANALIZA MEDIJEV
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Kako različni viri poročajo o istih zgodbah?
            </p>
            {lastUpdated && (
              <div className="mt-2 text-xs text-gray-400 font-mono">
                Zadnja osvežitev: {new Date(lastUpdated).toLocaleString('sl-SI')}
              </div>
            )}
          </div>

          {!analysis || analysis.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              Trenutno ni na voljo nobene analize. Poskusite kasneje.
            </div>
          ) : (
            <div className="space-y-8">
              {analysis.map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                  
                  {/* Glava kartice */}
                  <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {item.topic}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {item.comparison}
                      </p>
                    </div>
                    
                    {/* Clickbait Score Badge */}
                    <div className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl border ${getScoreColor(item.clickbait_score)}`}>
                        <span className="text-xs font-bold uppercase tracking-wider opacity-70">Clickbait</span>
                        <span className="text-2xl font-black">{item.clickbait_score}<span className="text-sm opacity-50">/10</span></span>
                    </div>
                  </div>

                  {/* Vsebina kartice */}
                  <div className="p-6 grid md:grid-cols-2 gap-6 bg-gray-50/50 dark:bg-gray-800/50">
                     {/* Najboljši naslov */}
                     <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-800/30">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-lg">✅</span>
                           <span className="text-xs font-bold uppercase text-green-700 dark:text-green-400">Najbolj korekten</span>
                        </div>
                        <p className="text-gray-800 dark:text-gray-200 font-medium italic">
                          "{item.best_headline}"
                        </p>
                     </div>

                     {/* Najslabši naslov (če obstaja) */}
                     {item.worst_headline && (
                       <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-800/30">
                          <div className="flex items-center gap-2 mb-2">
                             <span className="text-lg">⚠️</span>
                             <span className="text-xs font-bold uppercase text-red-700 dark:text-red-400">Senzacionalizem</span>
                          </div>
                          <p className="text-gray-800 dark:text-gray-200 font-medium italic">
                            "{item.worst_headline}"
                          </p>
                       </div>
                     )}
                  </div>
                  
                  {/* AI Komentar */}
                  <div className="px-6 py-3 bg-gray-100 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                     <span>🤖 AI Komentar:</span>
                     <span>{item.sensationalism}</span>
                  </div>

                </div>
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
             <Link href="/" className="px-6 py-3 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-sm font-bold text-gray-700 dark:text-gray-200">
                ← Nazaj na novice
             </Link>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  // Dobimo ZADNJO analizo
  const { data, error } = await supabase
    .from('media_analysis')
    .select('data, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return { props: { analysis: null, lastUpdated: null } }
  }

  return { 
    props: { 
      analysis: data.data,
      lastUpdated: data.created_at
    } 
  }
}
