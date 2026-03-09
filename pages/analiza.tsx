import React, { useState, ComponentType } from 'react'
import { GetStaticProps } from 'next'
import Head from 'next/head'
import Image from 'next/image' 
import dynamic from 'next/dynamic'
import Link from 'next/link'
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
  tone?: string;        
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

// PRENOVLJENE SUBTILNE ZNAČKE
function DNABadges({ dna }: { dna: MediaDNA }) {
  if (!dna) return null;

  const getSenzColor = (val: string) => {
      if (val === 'visok') return 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.6)]';
      if (val === 'srednji') return 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.6)]';
      return 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.4)]';
  };

  const getGapColor = (val: string) => {
      return val === 'da' ? 'bg-orange-500' : 'bg-gray-400 dark:bg-gray-600';
  };

  const getDensColor = (val: string) => {
      if (val === 'nizka') return 'bg-rose-500';
      if (val === 'srednja') return 'bg-blue-400';
      return 'bg-indigo-500';
  };

  return (
      <div className="flex flex-wrap gap-2 mt-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 px-2 py-0.5 rounded-md">
              <span className={`w-1.5 h-1.5 rounded-full ${getSenzColor(dna.sensationalism)}`}></span>
              <span>Senzacionalizem: <span className="text-gray-800 dark:text-gray-200 capitalize">{dna.sensationalism}</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 px-2 py-0.5 rounded-md">
              <span className={`w-1.5 h-1.5 rounded-full ${getGapColor(dna.info_gap)}`}></span>
              <span>Vrzel: <span className="text-gray-800 dark:text-gray-200 capitalize">{dna.info_gap}</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 px-2 py-0.5 rounded-md">
              <span className={`w-1.5 h-1.5 rounded-full ${getDensColor(dna.info_density)}`}></span>
              <span>Gostota: <span className="text-gray-800 dark:text-gray-200 capitalize">{dna.info_density}</span></span>
          </div>
      </div>
  );
}

function AnalysisCard({ item, setPreviewUrl }: { item: AnalysisItem, setPreviewUrl: (url: string) => void }) {
  const [showAllSources, setShowAllSources] = useState(false);
  const hasMore = (item.sources?.length || 0) > 4;
  const visibleSources = showAllSources ? item.sources : item.sources?.slice(0, 4);

  return (
    <article className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-xl overflow-hidden shadow-sm flex flex-col lg:flex-row transition-colors hover:border-gray-300 dark:hover:border-gray-600 items-stretch">
        
      {/* LEVI BLOK: Novica + Sinteza (Več prostora) */}
      <div className="w-full lg:w-[55%] xl:w-[60%] p-5 sm:p-6 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-700/50">
        
        <div className="text-[10px] font-bold uppercase tracking-wider text-brand mb-2">
           {item.topic}
        </div>
        
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900 dark:text-white leading-tight mb-3">
          {item.consensus_headline || item.topic}
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {item.main_image && (
            <div className="w-full sm:w-32 aspect-video sm:aspect-square bg-gray-100 dark:bg-gray-900 rounded-lg shrink-0 overflow-hidden relative">
                <img 
                src={proxiedImage(item.main_image, 400, 400, 1)} 
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
            </div>
            )}
            <p className="text-[13.5px] text-gray-600 dark:text-gray-300 leading-relaxed">
            {item.summary}
            </p>
        </div>
        
        <div className="mt-auto pt-2">
            <div className="bg-gray-50 dark:bg-gray-800/80 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.516 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                Medijski okvir (Framing)
              </div>
              <p className="text-[12.5px] text-gray-700 dark:text-gray-300 leading-relaxed font-normal">
                {item.framing_analysis}
              </p>
            </div>
        </div>
      </div>

      {/* DESNI BLOK: Viri in DNK */}
      <div className="w-full lg:w-[45%] xl:w-[40%] p-5 sm:p-6 bg-gray-50/50 dark:bg-[#1e293b]/30 flex flex-col">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center justify-between">
            <span>Interpretacije virov ({item.sources?.length || 0})</span>
        </div>
        
        <div className="flex flex-col gap-4 transition-all duration-300">
          {visibleSources?.map((source, sIdx) => {
              // Odstranimo narekovaje na začetku in koncu naslova
              const cleanTitle = source.title.replace(/^["']|["']$/g, '');

              return (
              <div key={sIdx} className="group/source flex flex-col p-2.5 -mx-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg hover:shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                
                {/* Naslov in ikona */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="relative w-5 h-5 shrink-0 mt-0.5 transition-all">
                    <Image 
                        src={getLogoSrc(source.source)} 
                        alt="" 
                        fill 
                        className="object-contain group-hover/source:opacity-0 transition-opacity duration-200" 
                    />
                    <div className="absolute inset-0 opacity-0 group-hover/source:opacity-100 flex items-center justify-center transition-opacity duration-200">
                        <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewUrl(source.url); }}
                            title="Predogled članka"
                            className="text-brand flex items-center justify-center p-0 bg-transparent border-none cursor-pointer transition-transform duration-200 hover:scale-[1.2]"
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" />
                            </svg>
                        </button>
                    </div>
                  </div>

                  <a href={source.url} target="_blank" rel="noopener" title={cleanTitle} className="text-[13px] font-medium text-gray-800 dark:text-gray-200 leading-snug hover:text-brand transition-colors">
                    {cleanTitle}
                  </a>
                </div>
                
                {/* Značke DNK (zamaknjene pod naslov) */}
                <div className="pl-8">
                    {source.media_dna ? (
                        <DNABadges dna={source.media_dna} />
                    ) : source.tone ? (
                        <div className="mt-1.5 inline-block text-[9px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium">
                          Ton: {source.tone}
                        </div>
                    ) : null}
                </div>
              </div>
            )})}
        </div>

        {hasMore && (
           <button 
              onClick={() => setShowAllSources(!showAllSources)}
              className="mt-5 text-[10px] font-bold uppercase tracking-widest text-brand hover:text-brand/70 transition-colors self-start flex items-center gap-1 bg-brand/5 px-3 py-1.5 rounded-full"
           >
              {showAllSources ? '✕ Pomanjšaj seznam' : `Pokaži še ${(item.sources?.length || 0) - 4} vire`}
           </button>
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

      <main className="min-h-screen bg-[#F9FAFB] dark:bg-gray-900 pb-20">
        
        <div className="bg-white dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 py-6 md:py-10">
            <div className="max-w-[1200px] mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                      <div className="bg-brand/10 p-2 rounded-lg text-brand">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672Zm-7.518-.267A8.25 8.25 0 1 1 20.25 10.5M8.288 14.212A5.25 5.25 0 1 1 17.25 10.5" />
                        </svg>
                      </div>
                      <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white tracking-tight">
                          Medijski Monitor & DNK
                      </h1>
                  </div>
                  <p className="text-[13.5px] text-gray-500 dark:text-gray-400 max-w-3xl leading-relaxed">
                    Orodje za zmanjševanje informacijskega šuma. Sistem destilira novice v nevtralen <strong>Konsenzni naslov</strong> in analizira <strong>Medijski DNK</strong> vsakega vira. Hitro ločite suhoparna dejstva od senzacionalizma in clickbaita.
                  </p>
                </div>
                
                <div className="w-full md:w-auto flex flex-row-reverse md:flex-col items-center md:items-end justify-between md:justify-start gap-3 mt-2 md:mt-0">
                    {lastUpdated && (
                        <div className="text-[11px] font-mono text-gray-500 flex items-center gap-2 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-md bg-gray-50 dark:bg-gray-800/50 shrink-0 shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 animate-ping"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                            </span>
                            Osveženo: {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    )}
                    <Link href="/" className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm text-[11px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:text-brand hover:border-brand/30 hover:bg-brand/5 dark:hover:bg-gray-800 flex items-center gap-2 transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Naslovnica
                    </Link>
                </div>
            </div>
        </div>

        {/* LIST */}
        <div className="max-w-[1200px] mx-auto px-4 mt-8 space-y-8">
          {validAnalysis.length === 0 && (
            <div className="text-center py-20 text-gray-500 font-mono text-sm">Pridobivam najnovejše analize...</div>
          )}

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

export const getStaticProps: GetStaticProps = async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data, error } = await supabase.from('media_analysis').select('data, created_at').order('created_at', { ascending: false }).limit(1).single()

  if (error || !data) {
      return { 
          props: { analysis: null, lastUpdated: null },
          revalidate: 60 
      } 
  }

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
