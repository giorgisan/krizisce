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

// Čistejša arhitektura za logotipe
const LOGOS: Record<string, string> = {
  'rtvslo': '/logos/rtvslo.png',
  '24ur': '/logos/24ur.png',
  'siol': '/logos/siol.png',
  'delo': '/logos/delo.png',
  'dnevnik': '/logos/dnevnik.png',
  'slovenske': '/logos/slovenskenovice.png',
  'večer': '/logos/vecer.png',
  'n1': '/logos/n1.png',
  'svet24': '/logos/svet24.png',
  'zurnal': '/logos/zurnal24.png'
};

const getLogoSrc = (sourceName: string) => {
  const s = sourceName.toLowerCase().replace(/\s/g, '').replace(/\./g, '');
  for (const key in LOGOS) {
      if (s.includes(key)) return LOGOS[key];
  }
  return '/logo.png';
}

// 1. KOMPONENTA: Logotip (Pin) z Oblačkom in Očesom
function SourceLogoPin({ source, value, setPreviewUrl }: { source: SourceItem, value: number, setPreviewUrl: (url: string) => void }) {
    const cleanTitle = source.title.replace(/^["']|["']$/g, '');
    
    return (
        <div 
            className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 group/pin z-10 hover:z-50 transition-all duration-300 ease-out"
            style={{ left: `${value}%` }}
        >
            {/* OBLIKA IKONE: Kvadrat z zaobljenimi robovi (App Icon style) namesto kroga */}
            <div 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewUrl(source.url); }}
                className="w-7 h-7 bg-white rounded shadow-md border border-gray-200/80 dark:border-gray-600 flex items-center justify-center cursor-pointer transform hover:scale-125 transition-transform overflow-hidden relative"
            >
                <Image 
                    src={getLogoSrc(source.source)} 
                    alt={source.source} 
                    fill 
                    className="object-contain p-0.5" 
                    unoptimized 
                />
            </div>
            
            {/* TOOLTIP z naslovom in linkom */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-3.5 bg-gray-900 text-white text-[12px] leading-snug rounded-xl opacity-0 group-hover/pin:opacity-100 pointer-events-none group-hover/pin:pointer-events-auto transition-opacity shadow-2xl flex flex-col gap-2">
                <div className="font-bold text-brand uppercase tracking-wider text-[9px]">{source.source}</div>
                <div className="text-gray-100 font-medium">"{cleanTitle}"</div>
                
                {/* Gumb za originalni članek */}
                <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="mt-1 self-start flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-white transition-colors"
                >
                    Preberi izvirnik
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                </a>
                
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900"></div>
            </div>
        </div>
    )
}

// 2. KOMPONENTA: Kontinuirana premica v Radarju
function SpectrumLine({ title, leftLabel, rightLabel, propKey, gradient, sources, setPreviewUrl }: any) {
    return (
        <div className="mb-7 last:mb-0">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest">{title}</span>
            </div>
            
            <div className="relative w-full px-3">
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    <span className="w-1/3 text-left">{leftLabel}</span>
                    <span className="w-1/3 text-right">{rightLabel}</span>
                </div>
                
                <div className={`h-1.5 w-full rounded-full ${gradient} relative shadow-inner`}>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-gray-900/20 dark:bg-white/20 rounded-full"></div>
                    
                    {sources?.map((s: any, idx: number) => {
                        const val = s.media_dna?.[propKey] ?? 50; 
                        return <SourceLogoPin key={idx} source={s} value={val} setPreviewUrl={setPreviewUrl} />
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

  // Iskanje "Zmagovalcev" (ekstremov) za gamifikacijo
  const getWinner = (prop: keyof MediaDNA) => {
      if (!item.sources || item.sources.length === 0) return null;
      return [...item.sources].sort((a, b) => (b.media_dna?.[prop] || 0) - (a.media_dna?.[prop] || 0))[0];
  }
  const maxInfo = getWinner('informativnost');
  const maxEmo = getWinner('custveni_naboj');
  const maxInt = getWinner('pristranskost');

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${newsId}`;
    const shareText = `Medijski Radar: ${item.consensus_headline || item.topic} | via krizisce.si`;

    if (navigator.share) {
        try { await navigator.share({ title: 'Križišče | Medijski Radar', text: shareText, url }); return; } 
        catch (err) {}
    }
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article id={newsId} className={`relative mb-10 group/card transition-all duration-500 ${isFocused ? 'ring-2 ring-brand shadow-xl scale-[1.01]' : ''}`}>
      
      {/* EDITORIAL ŠTEVILKA */}
      <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand text-white rounded-lg shadow-lg z-20 flex items-center justify-center font-serif font-black text-sm border border-brand/20">
        {idx + 1}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-xl shadow-sm flex flex-col relative overflow-visible">
        
        {/* ZGORNJI DEL: Kompakten Signal (Brez headerja "Bistvo zgodbe") */}
        <div className="p-5 md:p-7 flex flex-col pl-8 md:pl-10">
          
          <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white leading-tight mb-5 mt-1">
            {item.consensus_headline || item.topic}
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-5 mb-5">
              {item.main_image && (
                <div className="w-full sm:w-40 aspect-video sm:aspect-square rounded-lg overflow-hidden relative border border-gray-100 dark:border-gray-700 shrink-0">
                    <img src={proxiedImage(item.main_image, 300, 300, 1)} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                  <ul className="space-y-2">
                      {bullets.map((bullet, bIdx) => (
                          <li key={bIdx} className="text-[13px] text-gray-700 dark:text-gray-300 leading-snug flex items-start gap-2.5">
                              <span className="text-brand mt-1.5 w-1 h-1 rounded-full shrink-0 bg-brand"></span>
                              <span>{bullet}</span>
                          </li>
                      ))}
                  </ul>
              </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-gray-800/40 rounded-lg border border-gray-100 dark:border-gray-700/50 p-3.5">
              <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-snug">
                  <strong className="text-gray-400 uppercase text-[9.5px] mr-2 tracking-wider font-bold">Kontekst:</strong>
                  {item.framing_analysis}
              </p>
          </div>
        </div>

        {/* SPODNJI DEL: Šum in Radar */}
        <div className="px-5 md:px-7 py-6 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-[#1e293b]/20 rounded-b-xl flex flex-col">
            
            {/* Zmagovalci (Gamifikacija) in Gumb Deli */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                <div className="flex items-center gap-3 md:gap-5 text-[9px] font-bold uppercase tracking-widest text-gray-400">
                    {maxInfo && (
                        <div className="flex items-center gap-1.5" title="Največja gostota dejstev v naslovu">
                            <span className="w-4 h-4 relative rounded overflow-hidden bg-white shadow-sm border border-gray-200 dark:border-gray-600 shrink-0"><Image src={getLogoSrc(maxInfo.source)} alt="" fill className="object-contain p-0.5" unoptimized/></span>
                            Največ informacij
                        </div>
                    )}
                    {maxEmo && (
                        <div className="flex items-center gap-1.5" title="Največ uporabe čustev in dramatizacije">
                            <span className="w-4 h-4 relative rounded overflow-hidden bg-white shadow-sm border border-gray-200 dark:border-gray-600 shrink-0"><Image src={getLogoSrc(maxEmo.source)} alt="" fill className="object-contain p-0.5" unoptimized/></span>
                            Najbolj dramatično
                        </div>
                    )}
                    {maxInt && (
                        <div className="flex items-center gap-1.5" title="Najbolj izrazito vsiljevanje mnenja">
                            <span className="w-4 h-4 relative rounded overflow-hidden bg-white shadow-sm border border-gray-200 dark:border-gray-600 shrink-0"><Image src={getLogoSrc(maxInt.source)} alt="" fill className="object-contain p-0.5" unoptimized/></span>
                            Najbolj pristransko
                        </div>
                    )}
                </div>

                <button onClick={handleShare} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand hover:text-brand/70 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.345m-9.566 7.53l9.566 5.345m0-10.704a2.25 2.25 0 113.108-1.35 2.25 2.25 0 01-3.108 1.35zm0 10.704a2.25 2.25 0 113.108 1.35 2.25 2.25 0 01-3.108-1.35z" /></svg>
                    {copied ? 'Kopirano!' : 'Deli Radar'}
                </button>
            </div>
            
            <SpectrumLine 
                title="Informacija" 
                propKey="informativnost" 
                leftLabel="Vaba" 
                rightLabel="Polna slika" 
                gradient="bg-gradient-to-r from-gray-300 via-blue-300 to-blue-500 dark:from-gray-600 dark:via-blue-500/50 dark:to-blue-500"
                sources={item.sources} 
                setPreviewUrl={setPreviewUrl} 
            />

            <SpectrumLine 
                title="Emocija" 
                propKey="custveni_naboj" 
                leftLabel="Nevtralno" 
                rightLabel="Dramatizacija" 
                gradient="bg-gradient-to-r from-emerald-300 via-amber-300 to-rose-500 dark:from-emerald-500/80 dark:via-amber-500/80 dark:to-rose-500/80"
                sources={item.sources} 
                setPreviewUrl={setPreviewUrl} 
            />

            <SpectrumLine 
                title="Interpretacija" 
                propKey="pristranskost" 
                leftLabel="Samo dejstva" 
                rightLabel="Uredniški spin" 
                gradient="bg-gradient-to-r from-teal-300 via-orange-300 to-red-500 dark:from-teal-500/80 dark:via-orange-500/80 dark:to-red-500/80"
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
        
        {/* HEADER: Povratek k staremu, bolj kompaktnemu dizajnu */}
        <div className="bg-white dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 py-6 md:py-8">
            <div className="max-w-[900px] mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <svg className="w-6 h-6 text-brand shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672Zm-7.518-.267A8.25 8.25 0 1 1 20.25 10.5M8.288 14.212A5.25 5.25 0 1 1 17.25 10.5" />
                      </svg>
                      Medijski Radar
                  </h1>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1 max-w-xl leading-relaxed">
                    Ena novica. Deset naslovov. Kdo pretirava? Destiliramo dejstva in razkrivamo šum na vizualnem spektru.
                  </p>
                </div>
                
                <div className="w-full md:w-auto flex flex-row-reverse md:flex-col items-center md:items-end justify-between md:justify-start gap-2 mt-1 md:mt-0">
                    {lastUpdated && (
                        <div className="text-[10px] md:text-[11px] font-mono text-gray-500 flex items-center gap-2 border border-gray-100 dark:border-gray-700 px-2.5 py-1.5 rounded bg-gray-50 dark:bg-gray-800/50 shrink-0">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 animate-ping"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand"></span>
                            </span>
                            Osveženo: {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    )}
                    <Link href="/" className="px-3 py-1.5 border border-transparent rounded-md text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-brand transition-all flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                        Nazaj
                    </Link>
                </div>
            </div>
        </div>

        <div className="max-w-[800px] mx-auto px-4 mt-8 md:mt-10">
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
