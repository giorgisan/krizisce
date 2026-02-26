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

const getToneUI = (tone: string) => {
  const t = tone.toLowerCase();
  if (t.includes('konfliktno')) return { label: 'Poudarja konflikt', style: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' };
  if (t.includes('tematsko')) return { label: 'Širši kontekst', style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
  if (t.includes('epizodično')) return { label: 'Fokus na dramo', style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
  if (t.includes('ekonomsko')) return { label: 'Fokus na stroške', style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
  return { label: 'Informativno', style: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20' }; 
}

function AnalysisCard({ item, setPreviewUrl }: { item: AnalysisItem, setPreviewUrl: (url: string) => void }) {
  const [showSources, setShowSources] = useState(false);

  return (
    <article className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-xl overflow-hidden shadow-sm transition-colors hover:border-gray-300 dark:hover:border-gray-600 w-full">
        
      <div className="flex flex-col md:flex-row w-full">
        
        {/* LEVI BLOK: Novica in Analiza (Zavzame 70% na namizju) */}
        <div className="w-full md:w-[70%] p-4 sm:p-5 flex flex-col sm:flex-row gap-5 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700/50">
          
          {/* Slika: self-start in aspect-video zakleneta pravilno razmerje in preprečita raztezanje */}
          {item.main_image && (
            <div className="w-full sm:w-56 aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0 relative self-start shadow-sm">
              <img 
                src={proxiedImage(item.main_image, 400, 225, 1)} 
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          
          {/* Vsebina novic in Analiza */}
          <div className="flex flex-col flex-1 min-w-0">
            <h2 className="text-[16px] sm:text-[17px] font-serif font-bold text-gray-900 dark:text-white leading-snug mb-2">
              {item.topic}
            </h2>
            <p className="text-[12.5px] sm:text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
              {item.summary}
            </p>
            
            {/* Citiran okvir - Navadna pisava (brez bold/italic) */}
            <div className="mt-auto pt-2">
              <div className="bg-brand/[0.03] dark:bg-brand/[0.05] border-l-2 border-brand/50 p-3.5 sm:p-4 rounded-r-lg">
                <div className="text-[9px] font-bold uppercase tracking-wider text-brand/80 mb-1.5">Analiza pristopa</div>
                <p className="text-[13px] text-gray-800 dark:text-gray-200 leading-relaxed font-normal">
                  {item.framing_analysis}
                </p>
              </div>
            </div>

            <button 
              onClick={() => setShowSources(!showSources)}
              className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-brand flex items-center gap-1.5 mt-4 transition-colors self-start"
            >
              {showSources ? '✕ Skrij vire' : `↳ Prikaži vire (${item.sources?.length || 0})`}
            </button>
          </div>
        </div>

        {/* DESNI BLOK: Viri (Zavzame 30% na namizju). Vsebina se prikaže ob kliku, a prostor vedno obstaja. */}
        <div className="w-full md:w-[30%] p-4 sm:p-5 flex flex-col bg-gray-50/30 dark:bg-gray-800/10">
            {showSources && (
                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300 h-full">
                    <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                        Viri poročanja
                    </div>
                    <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                        {item.sources?.map((source, sIdx) => {
                            const toneUI = getToneUI(source.tone);
                            return (
                                <div key={sIdx} className="group/source flex flex-col gap-1.5 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm hover:border-brand/40 transition-colors w-full">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        
                                        <div className="relative w-4 h-4 shrink-0 transition-all">
                                            <Image 
                                                src={getLogoSrc(source.source)} alt="" fill 
                                                className="object-contain grayscale opacity-60 group-hover/source:opacity-0 transition-opacity duration-300" 
                                            />
                                            {/* Zapakirano v button za TS compatibility in click dogodek */}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/source:opacity-100 transition-opacity duration-300">
                                                <button 
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewUrl(source.url); }} 
                                                    title="Predogled članka"
                                                    className="text-brand cursor-pointer hover:scale-[1.3] transition-transform duration-200 transform-gpu bg-transparent border-none p-0 flex items-center justify-center"
                                                >
                                                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <a href={source.url} target="_blank" rel="noopener" className="text-[12px] font-medium text-gray-700 dark:text-gray-300 truncate hover:text-brand transition-colors">
                                            {source.title}
                                        </a>
                                    </div>
                                    <div className="pl-6">
                                        <span className={`inline-block text-[8.5px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wide ${toneUI.style}`}>
                                            {toneUI.label}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>

      </div>
    </article>
  );
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

      <main className="min-h-screen bg-[#F9FAFB] dark:bg-gray-900 pb-20 flex flex-col items-center">
        
        {/* HEADER SEKCIJA: Širina ujemajoča s spodnjim kontejnerjem */}
        <div className="w-full bg-white dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 flex justify-center">
            <div className="w-full max-w-[1040px] px-4 md:px-8 py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="text-2xl">⚖️</span> Medijski Monitor
                  </h1>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 max-w-2xl leading-relaxed">
                    Strojna analiza pristopa k poročanju. Zaznavamo vzorce medijev: od iskanja drame in konfliktov do širšega konteksta in iskanja rešitev.
                  </p>
                </div>
                {lastUpdated && (
                    <div className="shrink-0 text-[11px] font-mono text-gray-500 flex items-center gap-2 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded bg-gray-50 dark:bg-gray-800/50">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 animate-ping"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand"></span>
                        </span>
                        Osveženo: {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                )}
            </div>
        </div>

        {/* KARTICE NOVIC: Ujemajoča max širina */}
        <div className="w-full max-w-[1040px] px-4 md:px-8 mt-8 flex flex-col items-start gap-6">
          {validAnalysis.length === 0 && (
            <div className="text-center py-20 text-gray-500 font-mono text-sm w-full">Pridobivam najnovejše analize...</div>
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
