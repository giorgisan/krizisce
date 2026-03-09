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
  sensationalism: string; // nizek, srednji, visok
  info_gap: string;       // da, ne
  info_density: string;   // nizka, srednja, visoka
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

// VIZUALNI DNA BAR
function DNABar({ dna }: { dna: MediaDNA }) {
  if (!dna) return null;

  // Logika za Senzacionalizem (Stopnje 1-3)
  const getSenzLevel = (val: string) => {
    if (val === 'visok') return 3;
    if (val === 'srednji') return 2;
    return 1;
  };
  const senzLevel = getSenzLevel(dna.sensationalism);
  const senzColor = senzLevel === 3 ? 'bg-red-500' : senzLevel === 2 ? 'bg-amber-400' : 'bg-emerald-400';

  // Logika za Gostoto (Stopnje 1-3)
  const getDensLevel = (val: string) => {
    if (val === 'visoka') return 3;
    if (val === 'srednja') return 2;
    return 1;
  };
  const densLevel = getDensLevel(dna.info_density);
  const densColor = 'bg-blue-400';

  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {/* Vrstica: Senzacionalizem */}
      <div className="flex items-center justify-between group/dna relative">
        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Senzacionalizem</span>
        <div className="flex gap-0.5">
          <div className={`h-1.5 w-4 rounded-sm ${senzLevel >= 1 ? senzColor : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          <div className={`h-1.5 w-4 rounded-sm ${senzLevel >= 2 ? senzColor : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          <div className={`h-1.5 w-4 rounded-sm ${senzLevel >= 3 ? senzColor : 'bg-gray-200 dark:bg-gray-700'}`}></div>
        </div>
      </div>

      {/* Vrstica: Informativnost */}
      <div className="flex items-center justify-between group/dna relative">
        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Informativnost</span>
        <div className="flex gap-0.5">
          <div className={`h-1.5 w-4 rounded-sm ${densLevel >= 1 ? densColor : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          <div className={`h-1.5 w-4 rounded-sm ${densLevel >= 2 ? densColor : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          <div className={`h-1.5 w-4 rounded-sm ${densLevel >= 3 ? densColor : 'bg-gray-200 dark:bg-gray-700'}`}></div>
        </div>
      </div>

      {/* Vrstica: Clickbait (Vrzel) */}
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

// Pomožna funkcija za razbijanje povzetka v točke (če je potrebno)
const splitSummaryIntoBullets = (summary: string) => {
    // Razbijemo po pikah, ignoriramo prazne
    return summary.split('. ').filter(s => s.length > 5).map(s => s.trim() + (s.endsWith('.') ? '' : '.'));
}

// POSODOBLJENO: Komponenta zdaj sprejme prop 'idx' za prikaz številke
function AnalysisCard({ item, idx, setPreviewUrl }: { item: AnalysisItem, idx: number, setPreviewUrl: (url: string) => void }) {
  const [showAllSources, setShowAllSources] = useState(false);
  const hasMore = (item.sources?.length || 0) > 4;
  const visibleSources = showAllSources ? item.sources : item.sources?.slice(0, 4);

  const bullets = splitSummaryIntoBullets(item.summary);
  const rank = idx + 1; // Zaporedna številka novice

  return (
    <article className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-xl overflow-hidden shadow-sm hover:shadow transition-shadow flex flex-col xl:flex-row mb-8">
        
      {/* LEVI BLOK: Konsenz in Točke */}
      <div className="p-5 md:p-7 flex-1 border-b xl:border-b-0 xl:border-r border-gray-100 dark:border-gray-700/50 flex flex-col bg-slate-50/30 dark:bg-slate-900/20">
        
        <div className="flex items-center gap-2 mb-3">
           <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
           <span className="text-[10px] font-bold uppercase tracking-widest text-brand">Bistvo zgodbe</span>
        </div>
        
        <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white leading-tight mb-5">
          {item.consensus_headline || item.topic}
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-5 mb-5">
            {item.main_image && (
            <div className="w-full sm:w-1/3 aspect-[4/3] rounded-lg overflow-hidden relative bg-gray-100 dark:bg-gray-900 border border-gray-100 dark:border-gray-700/50 shrink-0">
                {/* Oznaka s številko (Glass effect) - NOVO */}
                <div className="absolute top-0 left-0 w-8 h-8 flex items-center justify-center z-20 pointer-events-none">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-br-xl border-b border-r border-white/10 shadow-sm" />
                    <span className="relative text-xs font-black text-white/90 font-sans drop-shadow-sm leading-none">
                        {rank}
                    </span>
                </div>

                <img 
                    src={proxiedImage(item.main_image, 400, 300, 1)} 
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
            </div>
            )}
            
            <div className="flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Ključna dejstva</div>
                <ul className="space-y-2">
                    {bullets.map((bullet, bulletIdx) => (
                        <li key={bulletIdx} className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed flex items-start gap-2">
                            <span className="text-brand mt-1 text-[8px]">●</span>
                            <span>{bullet}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        
        <div className="mt-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700/50 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.516 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                Medijski okvir (Kako poročajo)
            </div>
            <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-snug m-0">
                {item.framing_analysis}
            </p>
        </div>
      </div>

      {/* DESNI BLOK: Radar Medijev */}
      <div className="w-full xl:w-[420px] p-5 md:p-7 bg-white dark:bg-[#1e293b]/10 shrink-0 flex flex-col">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
            Medijski Radar ({item.sources?.length || 0})
        </div>
        
        <div className="flex flex-col gap-4">
          {visibleSources?.map((source, sIdx) => {
              const cleanTitle = source.title.replace(/^["']|["']$/g, '');

              return (
              // POSODOBLJENO: Hover efekt za oranžen (brand) border na levi
              <div key={sIdx} className="group/source flex flex-col p-3 -mx-3 hover:bg-brand/5 dark:hover:bg-brand/10 rounded-lg transition-all duration-200 border-l-4 border-transparent hover:border-brand">
                
                <div className="flex items-start gap-3">
                  <div className="relative w-5 h-5 shrink-0 mt-0.5">
                    <Image src={getLogoSrc(source.source)} alt="" fill className="object-contain" />
                    <div className="absolute inset-0 opacity-0 group-hover/source:opacity-100 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 transition-opacity duration-200 rounded">
                        <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewUrl(source.url); }}
                            title="Beri članek"
                            className="text-brand flex items-center justify-center p-0"
                        >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <a href={source.url} target="_blank" rel="noopener" className="text-[13px] font-medium text-gray-800 dark:text-gray-200 leading-snug hover:text-brand transition-colors block mb-2">
                        "{cleanTitle}"
                    </a>
                    
                    {/* DNA BAR */}
                    {source.media_dna && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50">
                            <DNABar dna={source.media_dna} />
                        </div>
                    )}
                  </div>
                </div>
              </div>
            )})}
        </div>

        {hasMore && (
           <button 
              onClick={() => setShowAllSources(!showAllSources)}
              className="mt-4 text-[10px] font-bold uppercase tracking-widest text-brand hover:text-brand/70 transition-colors self-center flex items-center gap-1 bg-brand/5 px-4 py-2 rounded-full"
           >
              {showAllSources ? 'Pomanjšaj' : `Pokaži še ${(item.sources?.length || 0) - 4} medijev`}
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
        <title>Medijski Radar | Križišče</title>
      </Head>

      <Header activeCategory="vse" activeSource="Vse" />

      <main className="min-h-screen bg-[#F9FAFB] dark:bg-gray-900 pb-20">
        
        {/* HEADER IN LEGENDA */}
        <div className="bg-white dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 py-8">
            <div className="max-w-[1200px] mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div className="max-w-2xl">
                        <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white tracking-tight mb-2">
                            Medijski Radar
                        </h1>
                        <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed">
                            Odkrijte manipulacije v naslovih. Sistem destilira novice in prikaže <strong>Bistvo zgodbe</strong>, hkrati pa vizualizira <strong>Medijski DNK</strong> vsakega vira.
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {/* Gumb NAZAJ */}
                        <Link href="/" className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm text-[11px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:text-brand hover:border-brand/30 hover:bg-brand/5 dark:hover:bg-gray-800 flex items-center gap-2 transition-all">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Nazaj
                        </Link>

                        {/* OSVEŽENO - POSODOBLJENO Z "Osveženo: " */}
                        {lastUpdated && (
                            <div className="text-[11px] font-mono text-gray-500 flex items-center gap-2 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-md bg-gray-50 dark:bg-gray-800/50 shadow-sm">
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

        {/* LIST */}
        <div className="max-w-[1200px] mx-auto px-4 mt-8">
          {validAnalysis.length === 0 && (
            <div className="text-center py-20 text-gray-500 font-mono text-sm">Pridobivam najnovejše analize...</div>
          )}

          {/* POSODOBLJENO: Dodan 'idx' prop pri klicu AnalysisCard */}
          {validAnalysis.map((item, idx) => (
            <AnalysisCard key={idx} item={item} idx={idx} setPreviewUrl={setPreviewUrl} />
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
