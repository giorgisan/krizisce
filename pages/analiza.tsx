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

// NOVE, MINIMALISTIČNE ZNAČKE Z IKONAMI
function DNABadges({ dna }: { dna: MediaDNA }) {
  if (!dna) return null;

  // Barvne logike (zdaj bolj subtilne za ikone)
  const getSenzColor = (val: string) => {
      if (val === 'visok') return 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20';
      if (val === 'srednji') return 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
      return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
  };

  const getGapColor = (val: string) => {
      return val === 'da' ? 'text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400 border-orange-200 dark:border-orange-500/20' 
                          : 'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
  };

  const getDensColor = (val: string) => {
      if (val === 'nizka') return 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20';
      if (val === 'srednja') return 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
      return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20';
  };

  return (
      <div className="flex flex-wrap gap-1.5 mt-1.5">
          <span title={`Senzacionalizem: ${dna.sensationalism}`} className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getSenzColor(dna.sensationalism)}`}>
              <span>🔥</span> {dna.sensationalism}
          </span>
          <span title={`Vaba (Clickbait): ${dna.info_gap}`} className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getGapColor(dna.info_gap)}`}>
              <span>🎣</span> {dna.info_gap}
          </span>
          <span title={`Informativnost: ${dna.info_density}`} className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getDensColor(dna.info_density)}`}>
              <span>🧠</span> {dna.info_density}
          </span>
      </div>
  );
}

function AnalysisCard({ item, setPreviewUrl }: { item: AnalysisItem, setPreviewUrl: (url: string) => void }) {
  const [showAllSources, setShowAllSources] = useState(false);
  const hasMore = (item.sources?.length || 0) > 4;
  const visibleSources = showAllSources ? item.sources : item.sources?.slice(0, 4);

  return (
    <article className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-xl overflow-hidden shadow-sm hover:shadow transition-shadow flex flex-col md:flex-row">
        
      {/* LEVI BLOK: Novica + Sinteza */}
      <div className="p-4 md:p-5 flex-1 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700/50 flex flex-col">
        
        <div className="text-[9px] font-bold uppercase tracking-wider text-brand mb-1.5">
           {item.topic}
        </div>
        
        <h2 className="text-lg md:text-xl font-serif font-bold text-gray-900 dark:text-white leading-snug mb-3">
          {item.consensus_headline || item.topic}
        </h2>
        
        <div className="flex gap-3 mb-4">
            {item.main_image && (
            <div className="w-20 md:w-28 shrink-0">
                <div className="aspect-[4/3] rounded-md overflow-hidden relative bg-gray-100 dark:bg-gray-900 border border-gray-100 dark:border-gray-700/50">
                    <img 
                        src={proxiedImage(item.main_image, 300, 200, 1)} 
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>
            </div>
            )}
            <p className="text-[12.5px] text-gray-600 dark:text-gray-300 leading-relaxed m-0">
                {item.summary}
            </p>
        </div>
        
        <div className="mt-auto bg-gray-50 dark:bg-gray-800/80 rounded-md border border-gray-100 dark:border-gray-700/50 p-2.5">
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.516 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                Medijski okvir (Framing)
            </div>
            <p className="text-[11.5px] text-gray-700 dark:text-gray-400 leading-snug m-0">
                {item.framing_analysis}
            </p>
        </div>
      </div>

      {/* DESNI BLOK: Viri */}
      <div className="p-4 md:p-5 w-full md:w-[340px] lg:w-[400px] bg-gray-50/50 dark:bg-[#1e293b]/30 shrink-0 flex flex-col">
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-3">
            Interpretacije medijev ({item.sources?.length || 0})
        </div>
        
        <div className="flex flex-col gap-3">
          {visibleSources?.map((source, sIdx) => {
              const cleanTitle = source.title.replace(/^["']|["']$/g, '');

              return (
              <div key={sIdx} className="flex items-start gap-2.5">
                <div className="relative w-4 h-4 shrink-0 mt-0.5">
                    <Image src={getLogoSrc(source.source)} alt="" fill className="object-contain" />
                </div>
                
                <div className="flex-1 min-w-0">
                    <a href={source.url} target="_blank" rel="noopener" title={cleanTitle} className="text-[12.5px] font-medium text-gray-800 dark:text-gray-200 leading-snug hover:text-brand transition-colors block mb-0.5">
                        {cleanTitle}
                    </a>
                    {source.media_dna ? (
                        <DNABadges dna={source.media_dna} />
                    ) : source.tone ? (
                        <div className="mt-1 inline-block text-[8.5px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium">
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
              className="mt-4 text-[9px] font-bold uppercase tracking-widest text-brand hover:text-brand/70 transition-colors self-start flex items-center gap-1 bg-brand/5 px-2 py-1 rounded border border-brand/20"
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
        
        {/* HEADER IN LEGENDA */}
        <div className="bg-white dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 py-6 md:py-8">
            <div className="max-w-[1100px] mx-auto px-4">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-brand/10 p-2 rounded-lg text-brand hidden sm:block">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672Zm-7.518-.267A8.25 8.25 0 1 1 20.25 10.5M8.288 14.212A5.25 5.25 0 1 1 17.25 10.5" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white tracking-tight">
                            Medijski Monitor & DNK
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        {lastUpdated && (
                            <div className="text-[10px] font-mono text-gray-500 flex items-center gap-2 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded bg-gray-50 dark:bg-gray-800/50 shadow-sm">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 animate-ping"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand"></span>
                                </span>
                                {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                            </div>
                        )}
                        <Link href="/" className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded shadow-sm text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:text-brand transition-all flex items-center gap-1.5 bg-white dark:bg-gray-800">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Nazaj
                        </Link>
                    </div>
                </div>

                {/* LEGENDA (Pojasnilo DNK) */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 rounded-lg max-w-3xl">
                    <p className="text-[12px] text-gray-600 dark:text-gray-300 mb-3">
                        Sistem destilira novice v nevtralen <strong>Konsenzni naslov</strong> in analizira <strong>Medijski DNK</strong> virov. Kaj pomenijo posamezne ikone ob naslovih medijev?
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex items-start gap-2">
                            <span className="text-lg leading-none">🔥</span>
                            <div>
                                <div className="text-[11px] font-bold text-gray-800 dark:text-gray-200">Senzacionalizem</div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">Mera čustvenega naboja in dramatičnega izrazoslovja.</div>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-lg leading-none">🎣</span>
                            <div>
                                <div className="text-[11px] font-bold text-gray-800 dark:text-gray-200">Clickbait vaba</div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">Ali naslov namerno skriva ključno dejstvo, da bi pridobil klik?</div>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-lg leading-none">🧠</span>
                            <div>
                                <div className="text-[11px] font-bold text-gray-800 dark:text-gray-200">Informativnost</div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">Koliko konkretnih dejstev izveste že iz samega naslova.</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        {/* LIST */}
        <div className="max-w-[1100px] mx-auto px-4 mt-6 space-y-5">
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
