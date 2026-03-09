import React, { useState, ComponentType, useEffect, useRef } from 'react'
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

function DNABar({ dna }: { dna: MediaDNA }) {
  if (!dna) return null;
  const senzLevels: Record<string, number> = { 'visok': 3, 'srednji': 2, 'nizek': 1 };
  const densLevels: Record<string, number> = { 'visoka': 3, 'srednja': 2, 'nizka': 1 };
  
  const senzLevel = senzLevels[dna.sensationalism] || 1;
  const densLevel = densLevels[dna.info_density] || 1;
  
  const senzColor = senzLevel === 3 ? 'bg-red-500' : senzLevel === 2 ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <div className="flex flex-col gap-1 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-gray-400 uppercase font-bold">Senzacionalizem</span>
        <div className="flex gap-0.5">
          {[1,2,3].map(l => (
            <div key={l} className={`h-1 w-3 rounded-full ${senzLevel >= l ? senzColor : 'bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-gray-400 uppercase font-bold">Informativnost</span>
        <div className="flex gap-0.5">
          {[1,2,3].map(l => (
            <div key={l} className={`h-1 w-3 rounded-full ${densLevel >= l ? 'bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>
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
  
  const visibleSources = showAllSources ? item.sources : item.sources?.slice(0, 4);
  const bullets = item.summary.split('. ').filter(s => s.length > 5).map(s => s.trim() + (s.endsWith('.') ? '' : '.'));

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}#${newsId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article 
      id={newsId}
      className={`relative mb-12 transition-all duration-700 rounded-2xl ${isFocused ? 'ring-2 ring-brand shadow-2xl scale-[1.01]' : 'hover:shadow-md'}`}
    >
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl overflow-hidden flex flex-col xl:flex-row">
        
        {/* LEVI BLOK */}
        <div className="p-6 md:p-8 flex-1 flex flex-col bg-slate-50/40 dark:bg-slate-900/20">
          
          <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4">
                {/* OČIŠČENA ŠTEVILKA: Brez ozadja, samo serifni font in brand barva */}
                <span className="text-3xl font-serif italic text-brand/30 leading-none select-none">
                  {idx + 1}
                </span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand">Bistvo zgodbe</span>
                </div>
              </div>

              <button 
                onClick={handleShare}
                className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-brand transition-all bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.345m-9.566 7.53l9.566 5.345m0-10.704a2.25 2.25 0 113.108-1.35 2.25 2.25 0 01-3.108 1.35zm0 10.704a2.25 2.25 0 113.108 1.35 2.25 2.25 0 01-3.108-1.35z" />
                </svg>
                {copied ? 'Kopirano!' : 'Deli novico'}
              </button>
          </div>
          
          <h2 className="text-xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white leading-tight mb-8">
            {item.consensus_headline || item.topic}
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-8 mb-8">
              {item.main_image && (
                <div className="w-full sm:w-40 aspect-square rounded-xl overflow-hidden relative border border-gray-200 dark:border-gray-700 shrink-0 shadow-inner">
                    <img src={proxiedImage(item.main_image, 400, 400, 1)} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              
              <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                    <span className="w-4 h-px bg-gray-200" /> Ključni poudarki
                  </div>
                  <ul className="space-y-3">
                      {bullets.map((bullet, bIdx) => (
                          <li key={bIdx} className="text-[14px] text-gray-700 dark:text-gray-300 leading-relaxed flex items-start gap-3">
                              <span className="text-brand mt-2 w-1.5 h-1.5 rounded-full shrink-0 border border-brand/50"></span>
                              <span>{bullet}</span>
                          </li>
                      ))}
                  </ul>
              </div>
          </div>
          
          <div className="mt-auto bg-white/50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700/50 p-5">
              <p className="text-[12.5px] text-gray-500 dark:text-gray-400 italic leading-relaxed">
                  <span className="font-bold text-gray-400 not-italic uppercase text-[10px] mr-2">Kontekst:</span>
                  {item.framing_analysis}
              </p>
          </div>
        </div>

        {/* DESNI BLOK */}
        <div className="w-full xl:w-[420px] p-6 md:p-8 bg-white dark:bg-gray-800 shrink-0 flex flex-col border-l border-gray-100 dark:border-gray-700">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-6 flex items-center justify-between">
              <span>Medijski Radar ({item.sources?.length || 0})</span>
          </div>
          
          <div className="flex flex-col gap-6">
            {visibleSources?.map((source, sIdx) => {
                const cleanTitle = source.title.replace(/^["']|["']$/g, '');
                return (
                <div key={sIdx} className="group/source flex flex-col transition-all">
                  <div className="flex items-start gap-3">
                    <div className="relative w-5 h-5 shrink-0 mt-1">
                      <Image src={getLogoSrc(source.source)} alt="" fill className="object-contain grayscale group-hover/source:grayscale-0 transition-all" unoptimized />
                    </div>
                    <div className="flex-1 min-w-0">
                      <a href={source.url} target="_blank" rel="noopener" className="text-[13px] font-medium text-gray-800 dark:text-gray-200 leading-snug hover:text-brand transition-colors block mb-3">
                          {cleanTitle}
                      </a>
                      {source.media_dna && <DNABar dna={source.media_dna} />}
                    </div>
                  </div>
                </div>
              )})}
          </div>

          {hasMore && (
             <button onClick={() => setShowAllSources(!showAllSources)} className="mt-8 text-[10px] font-bold uppercase tracking-widest text-brand hover:underline self-center bg-brand/5 px-4 py-2 rounded-full transition-all">
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
        <div className="bg-white dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 py-12">
            <div className="max-w-[1100px] mx-auto px-4 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="max-w-2xl">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white tracking-tight mb-4 italic">Medijski Radar</h1>
                    <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed font-light">
                        Destiliramo <strong>Bistvo zgodbe</strong> in razkrivamo <strong>Medijski DNK</strong>. Neodvisna analiza informacijskega šuma v realnem času.
                    </p>
                </div>
                <Link href="/" className="px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:text-brand hover:border-brand/50 bg-white dark:bg-gray-800 transition-all flex items-center gap-2 shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    Naslovnica
                </Link>
            </div>
        </div>
        <div className="max-w-[1100px] mx-auto px-4 mt-16">
          {validAnalysis.map((item, idx) => (
            <AnalysisCard key={idx} item={item} idx={idx} setPreviewUrl={setPreviewUrl} />
          ))}
        </div>
      </main>
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
  return { props: { analysis: Array.isArray(content) ? content : (content as any).data || null, lastUpdated: data.created_at }, revalidate: 60 }
}
