import React, { useState, ComponentType } from 'react'
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

// ZELO KOMPAKTEN VIZUALNI DNA BAR
function DNABar({ dna }: { dna: MediaDNA }) {
  if (!dna) return null;
  const senzLevels: Record<string, number> = { 'visok': 3, 'srednji': 2, 'nizek': 1 };
  const densLevels: Record<string, number> = { 'visoka': 3, 'srednja': 2, 'nizka': 1 };
  const senzLevel = senzLevels[dna.sensationalism] || 1;
  const densLevel = densLevels[dna.info_density] || 1;
  const senzColor = senzLevel === 3 ? 'bg-red-500' : senzLevel === 2 ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <div className="flex flex-col gap-1 mt-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[8.5px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Senzacionalizem</span>
        <div className="flex gap-0.5">
          {[1,2,3].map(l => (
            <div key={l} className={`h-1 w-3 rounded-sm ${senzLevel >= l ? senzColor : 'bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[8.5px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Informativnost</span>
        <div className="flex gap-0.5">
          {[1,2,3].map(l => (
            <div key={l} className={`h-1 w-3 rounded-sm ${densLevel >= l ? 'bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
         <span className="text-[8.5px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Clickbait Vaba</span>
         {dna.info_gap === 'da' ? (
           <span className="text-[8.5px] font-bold text-orange-500 uppercase">Da</span>
         ) : (
           <span className="text-[8.5px] font-bold text-gray-400 dark:text-gray-500 uppercase">Ne</span>
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
    <article id={newsId} className={`relative mb-6 group/card transition-all duration-500 ${isFocused ? 'ring-1 ring-brand shadow-xl scale-[1.005]' : ''}`}>
      
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-xl overflow-hidden shadow-sm hover:shadow transition-shadow flex flex-col md:flex-row relative">
        
        {/* ISTA ŠTEVILKA KOT NA TRENDING CARD */}
        <div className="absolute top-0 left-0 w-8 h-8 flex items-center justify-center z-20 pointer-events-none">
            <div className="absolute inset-0 bg-black/15 dark:bg-black/40 backdrop-blur-sm rounded-br-2xl rounded-tl-xl border-b border-r border-white/10 shadow-sm" />
            <span className="relative text-xs lg:text-xs font-black text-white/90 font-sans drop-shadow-sm leading-none">
                {idx + 1}
            </span>
        </div>
        
        {/* LEVI BLOK: Konsenz (Zmanjšani robovi in pisave) */}
        <div className="p-4 md:p-5 flex-1 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700/50 flex flex-col pl-10 md:pl-12">
          
          <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-brand">Bistvo zgodbe</span>
              </div>
              <button 
                onClick={handleShare}
                className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-gray-400 hover:text-brand transition-colors"
                title="Kopiraj povezavo do novice"
              >
                {copied ? 'Kopirano' : (
                   <>
                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.345m-9.566 7.53l9.566 5.345m0-10.704a2.25 2.25 0 113.108-1.35 2.25 2.25 0 01-3.108 1.35zm0 10.704a2.25 2.25 0 113.108 1.35 2.25 2.25 0 01-3.108-1.35z" /></svg>
                     <span>Deli</span>
                   </>
                )}
              </button>
          </div>
          
          {/* NASLOV KOT NA ARTICLE CARD */}
          <h2 className="text-[17px] md:text-[19px] font-bold text-gray-900 dark:text-white leading-snug mb-4">
            {item.consensus_headline || item.topic}
          </h2>
          
          {/* KOMPAKTNA POSTAVITEV: Majhna slika in dejstva */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
              {item.main_image && (
                <div className="w-full sm:w-28 aspect-video sm:aspect-square rounded-lg overflow-hidden relative bg-gray-100 dark:bg-gray-900 shrink-0 border border-gray-100 dark:border-gray-700/50">
                    <img src={proxiedImage(item.main_image, 300, 300, 1)} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              
              <div className="flex-1">
                  <ul className="space-y-1.5">
                      {bullets.map((bullet, bIdx) => (
                          <li key={bIdx} className="text-[12.5px] text-gray-600 dark:text-gray-300 leading-snug flex items-start gap-2">
                              <span className="text-brand mt-1.5 w-1 h-1 rounded-full shrink-0 bg-brand"></span>
                              <span>{bullet}</span>
                          </li>
                      ))}
                  </ul>
              </div>
          </div>
          
          <div className="mt-auto bg-gray-50/50 dark:bg-gray-800/40 rounded-md border border-gray-100 dark:border-gray-700/50 p-3">
              <p className="text-[11.5px] text-gray-500 dark:text-gray-400 leading-snug">
                  <strong className="text-gray-400 uppercase text-[9px] mr-1.5 tracking-wider">Kontekst:</strong>
                  {item.framing_analysis}
              </p>
          </div>
        </div>

        {/* DESNI BLOK: Radar (Zmanjšana širina in razmiki) */}
        <div className="w-full md:w-[320px] lg:w-[380px] p-4 md:p-5 bg-gray-50/30 dark:bg-[#1e293b]/20 shrink-0 flex flex-col">
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
              Medijski Radar ({item.sources?.length || 0})
          </div>
          <div className="flex flex-col gap-3">
            {visibleSources?.map((source, sIdx) => {
                const cleanTitle = source.title.replace(/^["']|["']$/g, '');
                return (
                <div key={sIdx} className="group/source flex flex-col p-2 -mx-2 hover:bg-brand/5 dark:hover:bg-brand/10 rounded-lg transition-all border-l-2 border-transparent hover:border-brand">
                  <div className="flex items-start gap-2.5">
                    
                    {/* OKO + POVEČAVA */}
                    <div className="relative w-4 h-4 shrink-0 mt-0.5 transition-transform duration-200 group-hover/source:scale-125">
                      <Image 
                        src={getLogoSrc(source.source)} 
                        alt="" 
                        fill 
                        className="object-contain grayscale group-hover/source:grayscale-0 group-hover/source:opacity-0 transition-all" 
                        unoptimized 
                      />
                      <div className="absolute inset-0 opacity-0 group-hover/source:opacity-100 flex items-center justify-center transition-opacity">
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewUrl(source.url); }} className="text-brand">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <a href={source.url} target="_blank" rel="noopener" className="text-[12px] font-medium text-gray-800 dark:text-gray-200 leading-snug hover:text-brand transition-colors block mb-1.5">
                          {cleanTitle}
                      </a>
                      {source.media_dna && <DNABar dna={source.media_dna} />}
                    </div>
                  </div>
                </div>
              )})}
          </div>
          {hasMore && (
             <button onClick={() => setShowAllSources(!showAllSources)} className="mt-4 text-[9px] font-bold uppercase tracking-widest text-brand hover:underline self-center">
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
        
        {/* HEADER: Zelo koherenten z ostalo stranjo (manjši in čistejši) */}
        <div className="bg-white dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 py-6 md:py-8">
            <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
                
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-2 md:gap-3">
                      <svg className="w-5 h-5 md:w-6 md:h-6 text-brand shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672Zm-7.518-.267A8.25 8.25 0 1 1 20.25 10.5M8.288 14.212A5.25 5.25 0 1 1 17.25 10.5" />
                      </svg>
                      Medijski Radar
                  </h1>
                  <p className="hidden md:block text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 max-w-2xl leading-relaxed">
                    Strojna analiza in pregled uredniških odločitev pri ključnih temah. Destiliramo novice v nevtralen format in razkrivamo informacijski šum.
                  </p>
                </div>
                
                <div className="w-full md:w-auto flex flex-row-reverse md:flex-col items-center md:items-end justify-between md:justify-start gap-3 mt-1 md:mt-0">
                    {lastUpdated && (
                        <div className="text-[10px] md:text-[11px] font-mono text-gray-500 flex items-center gap-2 border border-gray-100 md:border-gray-700 px-2 md:px-2.5 py-1 md:py-1.5 rounded bg-gray-50 dark:bg-gray-800/50 shrink-0">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 animate-ping"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand"></span>
                            </span>
                            Osveženo: {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    )}
                    <Link href="/" className="px-3 py-1.5 border border-gray-200 dark:border-gray-700/80 rounded-md shadow-sm text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-brand transition-all flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Naslovnica
                    </Link>
                </div>
            </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 mt-6">
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
