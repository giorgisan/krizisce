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
  if (t.includes('senzacija') || t.includes('drama') || t.includes('alarm')) return 'bg-red-500/[0.06] text-red-500/90';
  if (t.includes('vprašal') || t.includes('provokat')) return 'bg-orange-500/[0.06] text-orange-500/90';
  return 'bg-gray-500/[0.06] text-gray-400';
}

function AnalysisCard({ item, setPreviewUrl }: { item: AnalysisItem, setPreviewUrl: (url: string) => void }) {
  const [showSources, setShowSources] = useState(false);

  return (
    <article className="bg-white dark:bg-gray-800/40 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800/80 overflow-hidden flex flex-col h-fit">
      {/* SLIKA: Fiksni 16:9, ki v max-w-4xl gridu izgleda perfektno */}
      {item.main_image && (
        <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 relative border-b border-gray-100 dark:border-gray-800/50">
          <img 
            src={proxiedImage(item.main_image, 600, 338, 1)} 
            alt=""
            className="w-full h-full object-cover grayscale-[5%] hover:grayscale-0 transition-all duration-700"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <div className="p-4 flex flex-col gap-3">
        <div>
          <h2 className="text-[16px] font-bold text-gray-900 dark:text-white mb-1 leading-tight">{item.topic}</h2>
          <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed font-normal">{item.summary}</p>
        </div>
        
        <div className="bg-brand/[0.03] dark:bg-brand/[0.05] border-l-2 border-brand/40 p-3 rounded-r">
          <div className="text-[8px] font-bold uppercase tracking-wider text-brand/60 mb-1">Uredniški okvir</div>
          <p className="text-[13px] text-gray-800 dark:text-gray-200 font-medium leading-relaxed italic">
            "{item.framing_analysis || item.tone_difference}"
          </p>
        </div>

        {/* Dinamični gumb za vire */}
        <button 
          onClick={() => setShowSources(!showSources)}
          className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-brand flex items-center gap-2 mt-1 transition-colors"
        >
          {showSources ? '✕ Zapri vire' : `↳ Pokaži vire (${item.sources?.length || 0})`}
        </button>

        {showSources && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800/50 animate-in fade-in slide-in-from-top-1">
            <div className="flex flex-col gap-0.5">
              {item.sources?.map((source, sIdx) => (
                <div key={sIdx} className="group relative flex items-center justify-between py-1 px-1 hover:bg-gray-500/5 rounded transition-colors">
                  <a href={source.url} target="_blank" rel="noopener" className="flex items-center gap-2.5 min-w-0 flex-1 pr-10">
                    <div className="relative w-3.5 h-3.5 shrink-0 rounded-sm overflow-hidden grayscale group-hover:grayscale-0 opacity-80 group-hover:opacity-100 transition-all">
                      <Image src={getLogoSrc(source.source)} alt="" fill className="object-contain" />
                    </div>
                    <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400 truncate group-hover:text-brand transition-colors">
                      {source.title}
                    </span>
                  </a>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[7px] px-1.5 py-0.5 rounded-[2px] font-bold uppercase ${getToneColor(source.tone)}`}>
                      {source.tone}
                    </span>
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewUrl(source.url); }}
                      className="text-gray-400 hover:text-brand opacity-0 group-hover:opacity-100 transition-all p-1 hover:scale-125 transform-gpu"
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
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

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="bg-white dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 py-6 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h1 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="text-xl">⚖️</span> Medijski Monitor
                    </h1>
                    {lastUpdated && (
                        <div className="text-[10px] font-mono font-medium text-gray-400 flex items-center gap-2 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse"></span>
                            Osveženo: {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    )}
                </div>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-2 max-w-2xl leading-relaxed">
                    AI primerjava uredniških poudarkov in framinga najpomembnejših novic, ki so trenutno v fokusu slovenskih medijev.
                </p>
            </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {validAnalysis.map((item, idx) => (
            <AnalysisCard key={idx} item={item} setPreviewUrl={setPreviewUrl} />
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
  if (typeof content === 'string') { try { content = JSON.parse(content); } catch {} }

  return { 
    props: { 
        analysis: Array.isArray(content) ? content : (content as any).data || null, 
        lastUpdated: data.created_at 
    } 
  }
}
