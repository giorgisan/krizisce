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
  framing_analysis: string; 
  main_image?: string; 
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

const getToneBadge = (tone: string) => {
  const t = tone.toLowerCase();
  if (t.includes('konfliktno')) return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
  if (t.includes('tematsko')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  if (t.includes('epizodično')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
  if (t.includes('ekonomsko')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'; 
}

export default function AnalizaPage({ analysis, lastUpdated }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const validAnalysis = Array.isArray(analysis) ? analysis : [];

  return (
    <>
      <Head>
        <title>Medijski Monitor | Križišče</title>
      </Head>

      <Header activeCategory="vse" activeSource="Vse" />

      <main className="min-h-screen bg-[#F9FAFB] dark:bg-gray-900 pb-20">
        {/* HEADER */}
        <div className="bg-white dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 py-8 px-4">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="text-2xl">⚖️</span> Medijski Monitor
                  </h1>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 max-w-2xl leading-relaxed">
                    Strojna analiza uredniškega okvirjanja (framing) najpomembnejših novic. Pregled diskurza: od iskanja konfliktov (epizodično) do širših rešitev (tematsko).
                  </p>
                </div>
                {lastUpdated && (
                    <div className="shrink-0 text-[11px] font-mono text-gray-500 flex items-center gap-2 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded bg-gray-50 dark:bg-gray-800/50">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 animate-ping"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand"></span>
                        </span>
                        Osveženo: {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                )}
            </div>
        </div>

        {/* COMPACT DASHBOARD LIST */}
        <div className="max-w-6xl mx-auto px-4 mt-6 space-y-4">
          {validAnalysis.length === 0 && (
            <div className="text-center py-20 text-gray-500 font-mono text-sm">Pridobivam najnovejše analize...</div>
          )}

          {validAnalysis.map((item, idx) => (
            <article key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-lg overflow-hidden shadow-sm flex flex-col md:flex-row transition-colors hover:border-gray-300 dark:hover:border-gray-600">
                
              {/* 1. STOLPEC: Osnovna novica (~40%) */}
              <div className="w-full md:w-[40%] p-4 flex flex-col sm:flex-row gap-4 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700/50">
                {item.main_image && (
                  <div className="w-full sm:w-28 h-20 bg-gray-100 dark:bg-gray-800 rounded mb-2 sm:mb-0 shrink-0 overflow-hidden relative">
                    <img 
                      src={proxiedImage(item.main_image, 300, 200, 1)} 
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="flex flex-col justify-center">
                  <h2 className="text-[15px] font-serif font-bold text-gray-900 dark:text-white leading-snug mb-1.5">
                    {item.topic}
                  </h2>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-tight">
                    {item.summary}
                  </p>
                </div>
              </div>

              {/* 2. STOLPEC: AI Analiza (~35%) */}
              <div className="w-full md:w-[35%] p-4 bg-gray-50/50 dark:bg-gray-800/30 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700/50 flex flex-col justify-center">
                <div className="text-[9px] font-bold uppercase tracking-wider text-brand mb-1.5 flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Sinteza Okvirjanja
                </div>
                <p className="text-[13px] text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                  {item.framing_analysis}
                </p>
              </div>

              {/* 3. STOLPEC: Viri (~25%) */}
              <div className="w-full md:w-[25%] p-3.5 flex flex-col justify-center">
                <div className="flex flex-col gap-1">
                  {item.sources?.map((source, sIdx) => (
                    <div 
                      key={sIdx} 
                      onClick={() => setPreviewUrl(source.url)}
                      className="group flex items-center justify-between gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative w-3.5 h-3.5 shrink-0 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                          <Image src={getLogoSrc(source.source)} alt="" fill className="object-contain" />
                        </div>
                        <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 truncate group-hover:text-brand transition-colors">
                          {source.source}
                        </span>
                      </div>
                      <span className={`shrink-0 text-[8.5px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wide ${getToneBadge(source.tone)}`}>
                        {source.tone}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </article>
          ))}
        </div>
      </main>

      {previewUrl && <ArticlePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />}
      <Footer />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data, error } = await supabase.from('media_analysis').select('data, created_at').order('created_at', { ascending: false }).limit(1).single()

  if (error || !data) return { props: { analysis: null, lastUpdated: null } }

  let content = data.data;
  if (typeof content === 'string') { try { content = JSON.parse(content); } catch {} }

  return { 
    props: { 
        analysis: Array.isArray(content) ? content : (content as any).data || null, 
        lastUpdated: data.created_at 
    } 
  }
}
