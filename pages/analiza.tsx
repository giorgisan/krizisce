import React, { useState, ComponentType, useEffect } from 'react'
import { GetStaticProps } from 'next'
import Head from 'next/head'
import Image from 'next/image' 
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { createClient } from '@supabase/supabase-js'
import { proxiedImage } from '@/lib/img'

type PreviewProps = { url: string; onClose: () => void }
const ArticlePreview = dynamic(() => import('@/components/ArticlePreview'), {
  ssr: false,
}) as ComponentType<PreviewProps>

// INTERFACES
interface MediaDNA {
  sensationalism: string; 
  info_gap: string;       
  info_density: string;   
}

interface SourceItem {
  source: string;
  title: string;
  url: string; 
  media_dna?: MediaDNA; 
}

interface AnalysisItem {
  topic: string;
  consensus_headline?: string; 
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

// VIZUALNI DNA BAR (Kockice)
function DNABar({ dna }: { dna: MediaDNA }) {
  if (!dna) return null;
  
  const senzLevels: Record<string, number> = { 'visok': 3, 'srednji': 2, 'nizek': 1 };
  const densLevels: Record<string, number> = { 'visoka': 3, 'srednja': 2, 'nizka': 1 };
  
  const senzLevel = senzLevels[dna.sensationalism] || 1;
  const densLevel = densLevels[dna.info_density] || 1;
  
  const senzColor = senzLevel === 3 ? 'bg-red-500' : senzLevel === 2 ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {/* 1. Senzacionalizem */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Senzacionalizem</span>
        <div className="flex gap-0.5">
          {[1,2,3].map(l => (
            <div key={l} className={`h-1.5 w-4 rounded-sm ${senzLevel >= l ? senzColor : 'bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>
      </div>

      {/* 2. Informativnost */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Informativnost</span>
        <div className="flex gap-0.5">
          {[1,2,3].map(l => (
            <div key={l} className={`h-1.5 w-4 rounded-sm ${densLevel >= l ? 'bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>
      </div>

      {/* 3. Clickbait Vaba (Tole je manjkalo!) */}
      <div className="flex items-center justify-between">
         <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Clickbait Vaba</span>
         {dna.info_gap === 'da' ? (
           <span className="text-[10px] font-bold text-orange-500 uppercase">Da</span>
         ) : (
           <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Ne</span>
         )}
      </div>
    </div>
  );
}

function AnalysisCard({ item, idx, setPreviewUrl }: { item: AnalysisItem, idx: number, setPreviewUrl: (url: string) => void }) {
  const [showAllSources, setShowAllSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  
  const newsId = `novica-${idx + 1}`;
  const isFocused = router.asPath.includes(`#${newsId}`);
  
  const hasMore = (item.sources?.length || 0) > 4;
  const visibleSources = showAllSources ? item.sources : item.sources?.slice(0, 4);
  const bullets = item.summary.split('. ').filter(s => s.length > 5).map(s => s.trim() + (s.endsWith('.') ? '' : '.'));

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}#${newsId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article id={newsId} className={`relative mb-10 group/card transition-all duration-500 ${isFocused ? 'ring-2 ring-brand shadow-2xl' : ''}`}>
      
      {/* 1. EDITORIAL ŠTEVILKA (Premium & subtilna) */}
      <div className="absolute -top-3 -left-3 w-9 h-9 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded shadow-xl z-20 flex items-center justify-center font-serif font-black text-sm border-2 border-brand/20">
        {idx + 1}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col xl:flex-row relative">
        
        {/* LEVI BLOK: Konsenz */}
        <div className="p-6 md:p-8 flex-1 border-b xl:border-b-0 xl:border-r border-gray-100 dark:border-gray-700/50 flex flex-col bg-slate-50/30 dark:bg-slate-900/20 pl-10 md:pl-12">
          
          <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand">Bistvo zgodbe</span>
              </div>
              <button 
                onClick={handleShare}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-brand transition-all border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 shadow-sm"
              >
                {copied ? 'Link kopiran!' : 'Deli novico'}
              </button>
          </div>
          
          <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white leading-tight mb-6">
            {item.consensus_headline || item.topic}
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-6 mb-6">
              {item.main_image && (
                <div className="w-full sm:w-1/3 aspect-[4/3] rounded-lg overflow-hidden relative border border-gray-200 dark:border-gray-700 shrink-0">
                    <img src={proxiedImage(item.main_image, 400, 300, 1)} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Ključna dejstva</div>
                  <ul className="space-y-2">
                      {bullets.map((bullet, bIdx) => (
                          <li key={bIdx} className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed flex items-start gap-2.5">
                              <span className="text-brand mt-1.5 w-1 h-1 rounded-full shrink-0 bg-brand"></span>
                              <span>{bullet}</span>
                          </li>
                      ))}
                  </ul>
              </div>
          </div>
          <div className="mt-auto bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-100 dark:border-gray-700/50 p-4 italic text-[12px] text-gray-600 dark:text-gray-400">
              <span className="font-bold text-gray-400 not-italic uppercase text-[10px] mr-2">Kontekst:</span>
              {item.framing_analysis}
          </div>
        </div>

        {/* DESNI BLOK: Radar s popravljenim Hover učinkom */}
        <div className="w-full xl:w-[420px] p-6 md:p-8 bg-white dark:bg-gray-800 shrink-0 flex flex-col">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
              Medijski Radar ({item.sources?.length || 0})
          </div>
          <div className="flex flex-col gap-4">
            {visibleSources?.map((source, sIdx) => {
                const cleanTitle = source.title.replace(/^["']|["']$/g, '');
                return (
                <div key={sIdx} className="group/source flex flex-col p-3 -mx-3 hover:bg-brand/5 dark:hover:bg-brand/10 rounded-lg transition-all border-l-4 border-transparent hover:border-brand">
                  <div className="flex items-start gap-3">
                    
                    {/* VRNJENA LOGIKA: Oko namesto logotipa + povečava */}
                    <div className="relative w-5 h-5 shrink-0 mt-0.5 transition-transform duration-200 group-hover/source:scale-125">
                      <Image 
                        src={getLogoSrc(source.source)} 
                        alt="" 
                        fill 
                        className="object-contain grayscale group-hover/source:grayscale-0 group-hover/source:opacity-0 transition-all" 
                        unoptimized 
                      />
                      <div className="absolute inset-0 opacity-0 group-hover/source:opacity-100 flex items-center justify-center transition-opacity">
                        <button onClick={() => setPreviewUrl(source.url)} className="text-brand">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <a href={source.url} target="_blank" rel="noopener" className="text-[13.5px] font-medium text-gray-800 dark:text-gray-200 leading-snug hover:text-brand transition-colors block mb-2">
                          "{cleanTitle}"
                      </a>
                      {source.media_dna && <DNABar dna={source.media_dna} />}
                    </div>
                  </div>
                </div>
              )})}
          </div>
          {hasMore && (
             <button onClick={() => setShowAllSources(!showAllSources)} className="mt-6 text-[10px] font-bold uppercase tracking-widest text-brand hover:underline self-center bg-brand/5 px-4 py-2 rounded-full">
                {showAllSources ? 'Zapri' : `Poglej še ${(item.sources?.length || 0) - 4} vire`}
             </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default function AnalizaPage({ analysis, lastUpdated }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const validAnalysis = Array.isArray(analysis) ? analysis : [];

  return (
    <>
      <Head><title>Medijski Radar | Križišče</title></Head>
      <Header activeCategory="vse" activeSource="Vse" />
      <main className="min-h-screen bg-[#F9FAFB] dark:bg-gray-900 pb-20">
        
        {/* HEADER: Resen in analitičen, vrnjeno "Osveženo" */}
        <div className="bg-white dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 py-10 md:py-14">
            <div className="max-w-[1200px] mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="max-w-2xl">
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white tracking-tight mb-4 italic">Medijski Radar</h1>
                        <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed font-light">
                            Neodvisna analiza informacijskega šuma. Destiliramo <strong>Bistvo zgodbe</strong> in razkrivamo <strong>Medijski DNK</strong> vsakega vira.
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Link href="/" className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm text-[11px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:text-brand transition-all flex items-center justify-center gap-2 bg-white dark:bg-gray-800">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                            Domov
                        </Link>
                        {lastUpdated && (
                            <div className="text-[11px] font-mono text-gray-500 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 animate-ping"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                                </span>
                                Osveženo: {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 mt-12">
          {validAnalysis.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-mono text-sm italic">Pridobivam najnovejše analize...</div>
          ) : (
            validAnalysis.map((item, idx) => (
              <AnalysisCard key={idx} item={item} idx={idx} setPreviewUrl={setPreviewUrl} />
            ))
          )}
        </div>
      </main>

      {previewUrl && <ArticlePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />}
      <Footer />
    </>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data, error } = await supabase.from('media_analysis').select('data, created_at').order('created_at', { ascending: false }).limit(1).single()
  if (error || !data) return { props: { analysis: null, lastUpdated: null }, revalidate: 60 }
  let content = data.data;
  if (typeof content === 'string') { try { content = JSON.parse(content); } catch {} }
  return { 
    props: { 
        analysis: Array.isArray(content) ? content : (content as any).data || null, 
        lastUpdated: data.created_at 
    }, 
    revalidate: 60 
  }
}
