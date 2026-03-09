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

// 1. KOMPONENTA: Posamezen logotip v radarju s Tooltipom in Očesom
function SourceLogo({ source, setPreviewUrl }: { source: SourceItem, setPreviewUrl: (url: string) => void }) {
    const cleanTitle = source.title.replace(/^["']|["']$/g, '');
    return (
        <div className="relative group/logo z-10 hover:z-50">
            <div className="w-8 h-8 relative rounded-full overflow-hidden border border-gray-200 dark:border-gray-600 shadow-sm cursor-pointer transition-transform hover:scale-110 bg-white">
                <Image 
                    src={getLogoSrc(source.source)} 
                    alt={source.source} 
                    fill 
                    className="object-contain p-1.5 grayscale group-hover/logo:grayscale-0 transition-all" 
                    unoptimized 
                />
                <div 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewUrl(source.url); }}
                    className="absolute inset-0 opacity-0 group-hover/logo:opacity-100 bg-white/90 flex items-center justify-center transition-all"
                    title="Beri članek"
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                </div>
            </div>
            
            {/* TOOLTIP z dejanskim naslovom članka */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-gray-900 text-white text-[12px] leading-snug rounded-lg opacity-0 group-hover/logo:opacity-100 pointer-events-none transition-opacity shadow-2xl">
                <div className="font-bold text-brand uppercase tracking-wider text-[9px] mb-1.5">{source.source}</div>
                "{cleanTitle}"
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900"></div>
            </div>
        </div>
    )
}

// 2. KOMPONENTA: Posamezna vrstica (lane) v spektru
function SpectrumRow({ title, propKey, options, sources, setPreviewUrl }: any) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-2 sm:gap-4 py-2.5 border-b border-gray-100 dark:border-gray-800/50 last:border-0">
            <div className="w-32 flex items-center text-[10px] font-bold uppercase tracking-wider text-gray-400 shrink-0">
                {title}
            </div>
            <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
                {options.map((opt: any) => {
                    const matchingSources = sources.filter((s: any) => s.media_dna?.[propKey] === opt.value);
                    return (
                        <div key={opt.value} className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border ${opt.bg}`}>
                            <div className="text-[9px] font-bold uppercase tracking-widest mb-2 opacity-80">{opt.label}</div>
                            <div className="flex flex-wrap justify-center gap-1.5 min-h-[32px]">
                                {matchingSources.length > 0 ? (
                                    matchingSources.map((s: any, idx: number) => (
                                        <SourceLogo key={idx} source={s} setPreviewUrl={setPreviewUrl} />
                                    ))
                                ) : (
                                    <span className="text-[10px] text-gray-300 dark:text-gray-600 font-medium self-center">-</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// DEFINICIJE KATEGORIJ ZA SPEKTER
const senzOptions = [
  { value: 'nizek', label: 'Nizek', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400' },
  { value: 'srednji', label: 'Srednji', bg: 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/50 text-amber-700 dark:text-amber-400' },
  { value: 'visok', label: 'Visok', bg: 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-800/50 text-red-700 dark:text-red-400' }
];
const densOptions = [
  { value: 'nizka', label: 'Nizka', bg: 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/50 text-rose-700 dark:text-rose-400' },
  { value: 'srednja', label: 'Srednja', bg: 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/50 text-blue-700 dark:text-blue-400' },
  { value: 'visoka', label: 'Visoka', bg: 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-400' }
];
const gapOptions = [
  { value: 'ne', label: 'Ne (Brez vrzeli)', bg: 'bg-gray-50/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400' },
  { value: 'da', label: 'Da (Clickbait)', bg: 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/50 text-orange-700 dark:text-orange-400' }
];

const splitSummaryIntoBullets = (summary: string) => {
    return summary.split('. ').filter(s => s.length > 5).map(s => s.trim() + (s.endsWith('.') ? '' : '.'));
}

// 3. GLAVNA KARTICA NOVICE
function AnalysisCard({ item, idx, setPreviewUrl }: { item: AnalysisItem, idx: number, setPreviewUrl: (url: string) => void }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  
  const newsId = `novica-${idx + 1}`;
  const isFocused = router.asPath.includes(`#${newsId}`);
  
  const bullets = splitSummaryIntoBullets(item.summary);

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${newsId}`;
    const shareText = `Medijski Radar: ${item.consensus_headline || item.topic} | via krizisce.si`;

    if (navigator.share) {
        try {
            await navigator.share({ title: 'Križišče | Medijski Radar', text: shareText, url: url });
            return; 
        } catch (err) {}
    }
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article id={newsId} className={`relative mb-12 group/card transition-all duration-500 ${isFocused ? 'ring-2 ring-brand shadow-2xl' : ''}`}>
      
      {/* EDITORIAL ŠTEVILKA */}
      <div className="absolute -top-3 -left-3 w-9 h-9 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded shadow-xl z-20 flex items-center justify-center font-serif font-black text-sm border-2 border-brand/20">
        {idx + 1}
      </div>

      {/* ENOTEN BLOK KARTICE (Namesto leve in desne) */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-xl shadow-sm flex flex-col relative">
        
        {/* ZGORNJI DEL: Vsebina novice */}
        <div className="p-6 md:p-8 pb-5 flex flex-col pl-10 md:pl-12">
          
          <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand">Bistvo zgodbe</span>
              </div>
              <button 
                onClick={handleShare}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-brand transition-all border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800 shadow-sm"
              >
                {copied ? 'Kopirano!' : 'Deli novico'}
              </button>
          </div>
          
          <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white leading-tight mb-6">
            {item.consensus_headline || item.topic}
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-6 mb-6">
              {item.main_image && (
                <div className="w-full sm:w-40 aspect-[4/3] rounded-lg overflow-hidden relative border border-gray-200 dark:border-gray-700 shrink-0">
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
          
          <div className="bg-gray-50/80 dark:bg-gray-800/40 rounded-lg border border-gray-100 dark:border-gray-700/50 p-4 italic text-[12px] text-gray-600 dark:text-gray-400">
              <span className="font-bold text-gray-400 not-italic uppercase text-[10px] mr-2">Kontekst:</span>
              {item.framing_analysis}
          </div>
        </div>

        {/* SPODNJI DEL: Medijski Spekter (Novi Radar) */}
        <div className="px-6 md:px-8 pb-6 md:pb-8 pt-4 border-t border-gray-100 dark:border-gray-700/50 bg-slate-50/30 dark:bg-[#1e293b]/10 rounded-b-xl">
            <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Spekter Poročanja</span>
            </div>
            
            <div className="flex flex-col">
                <SpectrumRow title="Senzacionalizem" propKey="sensationalism" options={senzOptions} sources={item.sources} setPreviewUrl={setPreviewUrl} />
                <SpectrumRow title="Informativnost" propKey="info_density" options={densOptions} sources={item.sources} setPreviewUrl={setPreviewUrl} />
                <SpectrumRow title="Clickbait vaba" propKey="info_gap" options={gapOptions} sources={item.sources} setPreviewUrl={setPreviewUrl} />
            </div>
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
        
        {/* HEADER */}
        <div className="bg-white dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 py-10 md:py-14">
            <div className="max-w-[900px] mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="max-w-xl">
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 dark:text-white tracking-tight mb-4 italic">Medijski Radar</h1>
                        <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed font-light">
                            Neodvisna analiza informacijskega šuma. Destiliramo <strong>Bistvo zgodbe</strong> in razkrivamo <strong>Medijski DNK</strong> vsakega vira na vizualnem spektru.
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                        <Link href="/" className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm text-[11px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:text-brand transition-all flex items-center justify-center gap-2 bg-white dark:bg-gray-800 w-full sm:w-auto">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                            Domov
                        </Link>
                        {lastUpdated && (
                            <div className="text-[11px] font-mono text-gray-500 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto">
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

        <div className="max-w-[900px] mx-auto px-4 mt-12">
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
  return { props: { analysis: Array.isArray(content) ? content : (content as any).data || null, lastUpdated: data.created_at }, revalidate: 60 }
}
