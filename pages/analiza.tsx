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
  // Akademske metrike - barvno kodiranje
  if (t.includes('konfliktno')) return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
  if (t.includes('tematsko')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
  if (t.includes('epizodično')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
  if (t.includes('ekonomsko')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
  return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20'; // Informativno / Ostalo
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
        {/* HEADER SEKCIJA */}
        <div className="bg-white dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 py-10 px-4">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-3">
                      <span className="text-3xl">⚖️</span> Medijski Monitor
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-3xl leading-relaxed">
                    Strojna analiza uredniškega okvirjanja (framing) najpomembnejših novic. Zaznavamo vzorce poročanja: od iskanja konfliktov in čustvovanja (epizodično) do iskanja širših družbenih rešitev (tematsko).
                  </p>
                </div>
                {lastUpdated && (
                    <div className="shrink-0 text-xs font-mono text-gray-500 flex items-center gap-2 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-800/50">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 animate-ping"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                        </span>
                        Osveženo: {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                )}
            </div>
        </div>

        {/* 3-STOLPČNI CONTENT */}
        <div className="max-w-7xl mx-auto px-4 mt-8 space-y-6">
          {validAnalysis.length === 0 && (
            <div className="text-center py-20 text-gray-500 font-mono text-sm">Pridobivam najnovejše analize...</div>
          )}

          {validAnalysis.map((item, idx) => (
            <article key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="grid grid-cols-1 lg:grid-cols-12 md:divide-x divide-y lg:divide-y-0 divide-gray-100 dark:divide-gray-700/50">
                
                {/* 1. STOLPEC: Osnovna novica (Span 4) */}
                <div className="lg:col-span-4 p-5 flex flex-col">
                  {item.main_image && (
                    <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 mb-4 rounded-lg overflow-hidden shrink-0">
                      <img 
                        src={proxiedImage(item.main_image, 600, 300, 1)} 
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white leading-snug mb-2">
                    {item.topic}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                {/* 2. STOLPEC: Analiza okvirjanja (Span 4) */}
                <div className="lg:col-span-4 p-5 bg-gray-50/50 dark:bg-gray-800/20">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-brand mb-3 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    AI Sinteza Framing-a
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                    {item.framing_analysis}
                  </p>
                </div>

                {/* 3. STOLPEC: Viri in meritve (Span 4) */}
                <div className="lg:col-span-4 p-5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                    Pregled medijskih virov ({item.sources?.length || 0})
                  </div>
                  <div className="space-y-3">
                    {item.sources?.map((source, sIdx) => (
                      <div key={sIdx} className="group relative flex items-start gap-3 p-2 -mx-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors cursor-pointer" onClick={() => setPreviewUrl(source.url)}>
                        <div className="relative w-5 h-5 shrink-0 rounded-sm overflow-hidden mt-0.5">
                          <Image src={getLogoSrc(source.source)} alt="" fill className="object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                              {source.source}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${getToneBadge(source.tone)}`}>
                              {source.tone}
                            </span>
                          </div>
                          <h3 className="text-[13px] font-medium text-gray-800 dark:text-gray-200 leading-snug line-clamp-2 group-hover:text-brand transition-colors">
                            {source.title}
                          </h3>
                        </div>
                      </div>
                    ))}
                  </div>
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
