import React, { useState, ComponentType } from 'react'
import { GetServerSideProps } from 'next'
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

const getToneUI = (tone: string) => {
  const t = tone.toLowerCase();
  if (t.includes('konfliktno')) return { label: 'Poudarja konflikt', style: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' };
  if (t.includes('tematsko')) return { label: 'Širši kontekst', style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
  if (t.includes('epizodično')) return { label: 'Fokus na dramo', style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
  if (t.includes('ekonomsko')) return { label: 'Fokus na stroške', style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
  return { label: 'Informativno', style: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20' }; 
}

function AnalysisCard({ item, setPreviewUrl }: { item: AnalysisItem, setPreviewUrl: (url: string) => void }) {
  const [showAllSources, setShowAllSources] = useState(false);
  
  const hasMore = (item.sources?.length || 0) > 5;
  const visibleSources = showAllSources ? item.sources : item.sources?.slice(0, 5);

  return (
    <article className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row transition-colors hover:border-gray-300 dark:hover:border-gray-600 items-stretch">
        
      {/* LEVI BLOK: Novica + Sinteza (65%) */}
      <div className="w-full md:w-[65%] p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-5 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700/50">
        
        {item.main_image && (
          <div className="w-full sm:w-40 aspect-[21/9] sm:aspect-auto sm:h-32 bg-gray-100 dark:bg-gray-800 rounded shrink-0 overflow-hidden relative self-start">
            <img 
              src={proxiedImage(item.main_image, 400, 250, 1)} 
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        
        <div className="flex flex-col flex-1 min-w-0">
          <h2 className="text-[16px] font-serif font-bold text-gray-900 dark:text-white leading-snug mb-1">
            {item.topic}
          </h2>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-tight mb-3">
            {item.summary}
          </p>
          
          <div className="mt-2">
              <div className="bg-brand/[0.03] dark:bg-brand/[0.05] border-l-2 border-brand/40 pl-3 py-1.5">
                <div className="text-[9px] font-bold uppercase tracking-wider text-brand mb-1">Analiza pristopa</div>
                <p className="text-[12.5px] text-gray-700 dark:text-gray-300 leading-relaxed font-normal">
                  {item.framing_analysis}
                </p>
              </div>
          </div>
        </div>
      </div>

      {/* DESNI BLOK: Viri (35%) */}
      <div className="w-full md:w-[35%] p-4 sm:p-5 bg-gray-50/40 dark:bg-gray-800/20 flex flex-col">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Viri poročanja ({item.sources?.length || 0})
        </div>
        
        <div className="flex flex-col gap-1.5 transition-all duration-300">
          {visibleSources?.map((source, sIdx) => {
            const toneUI = getToneUI(source.tone);
            return (
              <div 
                key={sIdx} 
                className="group/source flex items-center justify-between gap-2.5 p-1.5 -mx-1.5 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-md transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  
                  {/* LOGO -> OKO logika. Tukaj (w-4 h-4) lahko povečaš logo */}
                  <div className="relative w-4 h-4 shrink-0 transition-all">
                    {/* Logo */}
                    <Image 
                        src={getLogoSrc(source.source)} 
                        alt="" 
                        fill 
                        className="object-contain group-hover/source:opacity-0 transition-opacity duration-200" 
                    />
                    {/* Oko */}
                    <div className="absolute inset-0 opacity-0 group-hover/source:opacity-100 flex items-center justify-center transition-opacity duration-200">
                        <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewUrl(source.url); }}
                            title="Predogled članka"
                            className="text-brand flex items-center justify-center p-0 bg-transparent border-none cursor-pointer transition-transform duration-200 hover:scale-[1.3]"
                        >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" />
                            </svg>
                        </button>
                    </div>
                  </div>

                  <a href={source.url} target="_blank" rel="noopener" title={source.title} className="text-[11.5px] font-medium text-gray-600 dark:text-gray-300 truncate hover:text-brand transition-colors">
                    {source.title}
                  </a>
                </div>
                
                <span className={`shrink-0 text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wide ${toneUI.style}`}>
                  {toneUI.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Gumb za razširitev virov */}
        {hasMore && (
           <button 
              onClick={() => setShowAllSources(!showAllSources)}
              className="mt-3 text-[9px] font-bold uppercase tracking-widest text-brand hover:text-brand/70 transition-colors self-start flex items-center gap-1"
           >
              {showAllSources ? '✕ Pomanjšaj seznam' : `↳ Pokaži vse vire (+${(item.sources?.length || 0) - 5})`}
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
        {/* HEADER - Popravljen px-4 za popolno poravnavo */}
        <div className="bg-white dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 py-8">
            <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="text-2xl">⚖️</span> Medijski Monitor
                  </h1>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 max-w-2xl leading-relaxed">
                    Strojna analiza pristopa k poročanju. Zaznavamo vzorce medijev: od iskanja drame in konfliktov do širšega konteksta in iskanja rešitev.
                  </p>
                </div>
                
                {/* Desni blok z uro in gumbom */}
                <div className="shrink-0 flex flex-col items-start md:items-end gap-3 mt-2 md:mt-0">
                    {lastUpdated && (
                        <div className="text-[11px] font-mono text-gray-500 flex items-center gap-2 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded bg-gray-50 dark:bg-gray-800/50">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 animate-ping"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand"></span>
                            </span>
                            Osveženo: {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    )}
                    <Link href="/" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-brand flex items-center gap-1.5 transition-colors">
                        ← Nazaj na naslovnico
                    </Link>
                </div>
            </div>
        </div>

        {/* LIST */}
        <div className="max-w-6xl mx-auto px-4 mt-6 space-y-5">
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
