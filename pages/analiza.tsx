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

// POSODOBLJENI INTERFACES ZA 0-100 LESTVICO
interface MediaDNA {
  informativnost: number; 
  custveni_naboj: number;       
  pristranskost: number;   
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

// 1. KOMPONENTA: Logotip (Pin) z Oblačkom in Očesom
function SourceLogoPin({ source, value, index, setPreviewUrl }: { source: SourceItem, value: number, index: number, setPreviewUrl: (url: string) => void }) {
    const cleanTitle = source.title.replace(/^["']|["']$/g, '');
    
    // Če imata dva medija isto vrednost, ju rahlo zamaknemo po višini, da se vidita oba
    const verticalOffset = index % 2 === 0 ? '-translate-y-[60%]' : '-translate-y-[40%]';

    return (
        <div 
            className={`absolute top-1/2 left-0 -translate-x-1/2 ${verticalOffset} group/pin z-10 hover:z-50 transition-all duration-300 ease-out`}
            style={{ left: `${value}%` }}
        >
            <div className="w-7 h-7 relative rounded-full overflow-hidden bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] ring-2 ring-white cursor-pointer transform hover:scale-125 transition-transform">
                {/* POLN BARVNI LOGO */}
                <Image 
                    src={getLogoSrc(source.source)} 
                    alt={source.source} 
                    fill 
                    className="object-contain p-1" 
                    unoptimized 
                />
                {/* OKO ZA PREDOGLED */}
                <div 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewUrl(source.url); }}
                    className="absolute inset-0 opacity-0 group-hover/pin:opacity-100 bg-white/90 flex items-center justify-center transition-all"
                    title="Beri članek"
                >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                </div>
            </div>
            
            {/* OBLAČEK Z NASLOVOM NOVICE */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-52 p-3 bg-gray-900 text-white text-[11px] leading-snug rounded-lg opacity-0 group-hover/pin:opacity-100 pointer-events-none transition-opacity shadow-2xl">
                <div className="font-bold text-brand uppercase tracking-wider text-[8px] mb-1.5">{source.source}</div>
                "{cleanTitle}"
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900"></div>
            </div>
        </div>
    )
}

// 2. KOMPONENTA: Kontinuirana premica v Radarju
function SpectrumLine({ title, leftLabel, rightLabel, propKey, gradient, sources, setPreviewUrl }: any) {
    return (
        <div className="mb-8 last:mb-2">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest">{title}</span>
            </div>
            
            <div className="relative w-full px-3">
                {/* Oznake nad/pod črto */}
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    <span className="w-1/3 text-left">{leftLabel}</span>
                    <span className="w-1/3 text-right">{rightLabel}</span>
                </div>
                
                {/* Zvezni barvni spekter (Gradient črta) */}
                <div className={`h-1.5 w-full rounded-full ${gradient} relative`}>
                    {/* Sredinska črtica za orientacijo (50%) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-gray-300 dark:bg-gray-600 rounded-full opacity-50"></div>
                    
                    {/* Logotipi virov */}
                    {sources?.map((s: any, idx: number) => {
                        const val = s.media_dna?.[propKey] ?? 50; // Fallback na sredino, če manjka
                        return (
                            <SourceLogoPin key={idx} source={s} value={val} index={idx} setPreviewUrl={setPreviewUrl} />
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

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
    <article id={newsId} className={`relative mb-14 group/card transition-all duration-500 ${isFocused ? 'ring-2 ring-brand shadow-2xl scale-[1.01]' : ''}`}>
      
      {/* EDITORIAL ŠTEVILKA */}
      <div className="absolute -top-3 -left-3 w-9 h-9 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded shadow-xl z-20 flex items-center justify-center font-serif font-black text-sm border-2 border-brand/20">
        {idx + 1}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl shadow-sm flex flex-col relative overflow-visible">
        
        {/* ZGORNJI DEL: Signal (AI Povzetek) */}
        <div className="p-6 md:p-8 pb-6 flex flex-col pl-10 md:pl-12">
          
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
          
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white leading-tight mb-6">
            {item.consensus_headline || item.topic}
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-6 mb-6">
              {item.main_image && (
                <div className="w-full sm:w-48 aspect-video sm:aspect-[4/3] rounded-xl overflow-hidden relative border border-gray-200 dark:border-gray-700 shrink-0">
                    <img src={proxiedImage(item.main_image, 400, 300, 1)} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3 border-b border-gray-100 dark:border-gray-700/50 pb-1">Ključna dejstva</div>
                  <ul className="space-y-2">
                      {bullets.map((bullet, bIdx) => (
                          <li key={bIdx} className="text-[13px] md:text-[14px] text-gray-700 dark:text-gray-300 leading-relaxed flex items-start gap-3">
                              <span className="text-brand mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-brand/80"></span>
                              <span>{bullet}</span>
                          </li>
                      ))}
                  </ul>
              </div>
          </div>
          
          <div className="bg-gray-50/80 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
              <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed italic">
                  <span className="font-bold text-gray-400 not-italic uppercase text-[10px] mr-2">Kontekst:</span>
                  {item.framing_analysis}
              </p>
          </div>
        </div>

        {/* SPODNJI DEL: Šum (Novi Radar Spekter) */}
        <div className="px-6 md:px-12 py-8 border-t border-gray-100 dark:border-gray-700/50 bg-slate-50/50 dark:bg-[#1e293b]/20 rounded-b-2xl">
            
            <SpectrumLine 
                title="Informativnost" 
                propKey="informativnost" 
                leftLabel="Clickbait Vaba" 
                rightLabel="Polna slika" 
                gradient="bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400"
                sources={item.sources} 
                setPreviewUrl={setPreviewUrl} 
            />

            <SpectrumLine 
                title="Čustveni naboj" 
                propKey="custveni_naboj" 
                leftLabel="Suho / Klinično" 
                rightLabel="Dramatizacija" 
                gradient="bg-gradient-to-r from-blue-400 via-purple-400 to-rose-500"
                sources={item.sources} 
                setPreviewUrl={setPreviewUrl} 
            />

            <SpectrumLine 
                title="Pristranskost" 
                propKey="pristranskost" 
                leftLabel="Samo dejstva" 
                rightLabel="Uredniški spin" 
                gradient="bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500"
                sources={item.sources} 
                setPreviewUrl={setPreviewUrl} 
            />
            
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
                            Odkrijte manipulacije v naslovih. Destiliramo <strong>Bistvo zgodbe (Signal)</strong> in na vizualnem spektru razkrivamo <strong>Medijski DNK (Šum)</strong>.
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
