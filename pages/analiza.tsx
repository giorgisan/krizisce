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
  for (const key of Object.keys(LOGOS)) {
      if (s.includes(key)) return LOGOS[key];
  }
  return '/logo.png';
}

// --- MODALNO OKNO (Ostane SUPER!) ---
function HowItWorksModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative transform transition-transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 md:p-8">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>

          <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-brand">💡</span> Kako deluje UI analiza?
          </h2>
          
          <div className="text-[14px] md:text-[15px] leading-relaxed text-gray-600 dark:text-gray-300 space-y-4">
            <p>
              Umetna inteligenca na našem portalu <strong>ne ocenjuje celotnega novinarskega dela</strong> ali vsebine dolgih člankov. Analizira izključno <span className="font-semibold text-gray-900 dark:text-gray-100">»izložbo«</span> – torej naslov in kratek povzetek, ki ga medij pošilja v splet in s katerim bralce vabi h kliku.
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 mt-4 space-y-4">
              <p className="font-medium text-gray-800 dark:text-gray-200">UI strojno ocenjuje 3 parametre na lestvici od 0 do 100:</p>
              <ul className="space-y-4 text-[13px] md:text-[14px]">
                <li>
                  <strong className="text-blue-600 dark:text-blue-400 block mb-0.5">
                    1. Informacija <span className="font-mono text-[11px] md:text-[12px] font-normal text-gray-500 dark:text-gray-400 opacity-80 ml-1">(Vaba vs. Dejstva)</span>
                  </strong>
                  Ali naslov takoj pove bistvo dogodka ali pa namerno skriva ključno informacijo, da bi vas prisilil v klik (t.i. <em>clickbait</em>)?
                </li>
                <li>
                  <strong className="text-rose-500 dark:text-rose-400 block mb-0.5">
                    2. Emocija <span className="font-mono text-[11px] md:text-[12px] font-normal text-gray-500 dark:text-gray-400 opacity-80 ml-1">(Nevtralno vs. Dramatizacija)</span>
                  </strong>
                  Ali medij poroča suho in klinično ali pa uporablja dramatične besede (šokantno, kaos, grozljivka), velike črke in klicaje za vzbujanje čustev?
                </li>
                <li>
                  <strong className="text-orange-500 dark:text-orange-400 block mb-0.5">
                    3. Interpretacija <span className="font-mono text-[11px] md:text-[12px] font-normal text-gray-500 dark:text-gray-400 opacity-80 ml-1">(Samo dejstva vs. Uredniški spin)</span>
                  </strong>
                  Ali povzetek navaja zgolj gola dejstva, ali pa vsebuje vrednostne sodbe in pridevnike, ki bralcu narekujejo, <em>kaj naj si o dogodku misli</em>?
                </li>
              </ul>
            </div>

            <p className="text-[13px] italic opacity-90 mt-4 pt-2 border-t border-gray-100 dark:border-gray-800">
              Sistem je 100% avtomatiziran. Model ne ve, za kateri slovenski medij gre, temveč ocenjuje zgolj surov tekst in išče vzorce nevtralnega novinarstva.
            </p>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/80 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-bold rounded-lg transition-colors"
          >
            Razumem
          </button>
        </div>
      </div>
    </div>
  )
}

// 1. KOMPONENTA: Animiran Kupček Logotipov
function ClusterGroup({ cluster, setPreviewUrl }: { cluster: { value: number, sources: SourceItem[] }, setPreviewUrl: (url: string) => void }) {
    const [isHovered, setIsHovered] = useState(false);
    const N = cluster.sources.length;
    
    const direction = cluster.value > 70 ? -1 : 1; 

    return (
        <div 
            className={`absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-8 h-8 cursor-pointer ${isHovered ? 'z-[100]' : 'z-10'}`}
            style={{ left: `${cluster.value}%` }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isHovered && N > 1 && (
                <div 
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{ 
                        height: '56px', 
                        width: `${N * 36 + 16}px`, 
                        left: direction === 1 ? '-8px' : 'auto',
                        right: direction === -1 ? '-8px' : 'auto',
                        marginTop: '-12px' 
                    }}
                />
            )}

            {cluster.sources.map((source, idx) => {
                const cleanTitle = source.title.replace(/^["']|["']$/g, '');
                const xOffsetPercent = N > 1 ? idx * 115 * direction : 0;
                const yLift = (isHovered && N > 1) ? '-14px' : '0px';
                
                return (
                    <div 
                        key={idx}
                        className="absolute top-1/2 left-1/2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group/pin hover:!z-[110]"
                        style={{
                            transform: isHovered 
                                ? `translate(calc(-50% + ${xOffsetPercent}%), calc(-50% + ${yLift}))` 
                                : `translate(calc(-50% + ${idx * 2}px), calc(-50% - ${idx * 2}px))`,
                            zIndex: isHovered ? 50 + idx : 20 - idx
                        }}
                    >
                        <div 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewUrl(source.url); }}
                            className="w-6 h-6 md:w-7 md:h-7 bg-white rounded shadow-md border-[0.5px] border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer transform group-hover/pin:scale-125 transition-transform overflow-hidden relative"
                        >
                            <Image 
                                src={getLogoSrc(source.source)} 
                                alt={source.source} 
                                fill 
                                className="object-contain p-[1.5px]" 
                                unoptimized 
                            />
                            <div className="absolute inset-0 opacity-0 group-hover/pin:opacity-100 bg-white/90 flex items-center justify-center transition-opacity duration-200">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand transform scale-50 group-hover/pin:scale-110 transition-transform duration-300 ease-out">
                                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" />
                                </svg>
                            </div>
                        </div>
                        
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 md:w-60 p-2.5 md:p-3 bg-gray-900 text-white text-[11px] leading-snug rounded-xl opacity-0 group-hover/pin:opacity-100 pointer-events-none group-hover/pin:pointer-events-auto transition-opacity shadow-2xl flex flex-col gap-1.5">
                            <div className="font-bold text-brand uppercase tracking-wider text-[8.5px]">{source.source}</div>
                            <div className="text-gray-100 font-medium text-[11px] md:text-[11.5px]">"{cleanTitle}"</div>
                            
                            <a 
                                href={source.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="mt-0.5 self-start flex items-center gap-1 text-[9.5px] font-bold text-gray-400 hover:text-white transition-colors"
                            >
                                Preberi izvirnik
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                            </a>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900"></div>
                        </div>
                    </div>
                )
            })}
            
            {!isHovered && N > 1 && (
                <div className="absolute -top-1 -right-1 md:-right-2 bg-brand text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full shadow-sm z-50">
                    {N}
                </div>
            )}
        </div>
    )
}

// 2. KOMPONENTA: Kontinuirana premica v Spektru
function SpectrumLine({ title, leftLabel, rightLabel, propKey, gradient, sources, setPreviewUrl }: any) {
    const clusters: { value: number, sources: SourceItem[] }[] = [];
    
    sources?.forEach((s: any) => {
        const raw = s.media_dna?.[propKey] ?? 50; 
        const val = Math.max(0, Math.min(100, raw));
        
        const existing = clusters.find(c => Math.abs(c.value - val) < 3);
        if (existing) {
            existing.sources.push(s);
        } else {
            clusters.push({ value: val, sources: [s] });
        }
    });

    return (
        <div className="mb-5 last:mb-0">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest">{title}</span>
            </div>
            
            <div className="relative w-full px-2">
                <div className="flex justify-between text-[8.5px] md:text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    <span className="w-1/3 text-left">{leftLabel}</span>
                    <span className="w-1/3 text-right">{rightLabel}</span>
                </div>
                
                <div className={`h-1.5 w-full rounded-full ${gradient} relative shadow-inner`}>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1.5px] h-3 bg-gray-900/20 dark:bg-white/20 rounded-full"></div>
                    
                    {clusters.map((cluster, idx) => (
                        <ClusterGroup 
                            key={`${propKey}-cluster-${idx}`} 
                            cluster={cluster} 
                            setPreviewUrl={setPreviewUrl} 
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

const splitSummaryIntoBullets = (summary: string) => {
    if (!summary) return [];
    return summary
        .replace(/(?<!\b(?:dr|mag|prof|št|oz|tj|itd|npr|dipl|doc|inž))\.\s+(?=[A-ZČŠŽ])/g, '.|SPLIT|')
        .split('.|SPLIT|')
        .filter(s => s.length > 5)
        .map(s => s.trim() + (s.endsWith('.') ? '' : '.'));
}

// 3. GLAVNA KARTICA NOVICE
function AnalysisCard({ item, idx, setPreviewUrl }: { item: AnalysisItem, idx: number, setPreviewUrl: (url: string) => void }) {
  const router = useRouter();
  const newsId = `novica-${idx + 1}`;
  const isFocused = router.asPath.endsWith(`#${newsId}`);
  const bullets = splitSummaryIntoBullets(item.summary);

  return (
    <article id={newsId} className={`relative mb-8 md:mb-12 group/card transition-all duration-500 ${isFocused ? 'ring-2 ring-brand shadow-xl scale-[1.005]' : ''}`}>
      
      <div className="absolute -top-3 -left-3 w-8 h-8 md:w-9 md:h-9 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded shadow z-20 flex items-center justify-center font-serif font-bold text-sm border border-gray-200 dark:border-gray-600">
        {idx + 1}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-xl shadow-sm flex flex-col relative overflow-visible">
        
        <div className="p-5 md:p-8 flex flex-col pl-8 md:pl-12">
          
          <h2 className="text-[20px] md:text-[24px] font-serif font-bold text-gray-900 dark:text-white leading-snug mb-4 mt-0.5">
            {item.consensus_headline || item.topic}
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-5 md:gap-6 mb-4">
              {item.main_image && (
                <div className="w-full sm:w-36 md:w-44 lg:w-48 aspect-video sm:aspect-[4/3] rounded-lg overflow-hidden relative border border-gray-100 dark:border-gray-700 shrink-0">
                    <img src={proxiedImage(item.main_image, 400, 300, 1)} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">Ključna dejstva</div>
                  <ul className="space-y-1.5 md:space-y-2">
                      {bullets.map((bullet, bIdx) => (
                          <li key={bIdx} className="text-[13px] md:text-[14px] text-gray-700 dark:text-gray-300 leading-snug flex items-start gap-2.5">
                              <span className="text-brand mt-1.5 w-1 h-1 rounded-full shrink-0 bg-brand"></span>
                              <span>{bullet}</span>
                          </li>
                      ))}
                  </ul>
              </div>
          </div>
          
          <div className="bg-gray-50/80 dark:bg-[#1e293b]/30 rounded-lg border border-gray-100 dark:border-gray-700/50 p-3.5 md:p-4 mt-2">
              <p className="text-[12.5px] md:text-[13.5px] text-gray-600 dark:text-gray-300 leading-relaxed">
                  <span className="font-bold text-gray-400 dark:text-gray-500 uppercase text-[9.5px] md:text-[11px] mr-2 tracking-wider">Kontekst:</span>
                  {item.framing_analysis}
              </p>
          </div>
        </div>

        <div className="px-6 md:px-10 py-5 md:py-7 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-[#1e293b]/20 rounded-b-xl flex flex-col">
            
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
  const [showInfoModal, setShowInfoModal] = useState(false); 

  const validAnalysis = Array.isArray(analysis) ? analysis : [];

  return (
    <>
      <Head><title>Medijski presek | Križišče</title></Head>
      <Header activeCategory="vse" activeSource="Vse" />
      
      {showInfoModal && <HowItWorksModal onClose={() => setShowInfoModal(false)} />}

      <main className="min-h-screen bg-[#F9FAFB] dark:bg-gray-900 pb-20 overflow-x-hidden">
        
        <div className="bg-white dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 py-6 md:py-10">
            <div className="max-w-[1000px] mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-3">
                      <svg className="w-7 h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 text-gray-900 dark:text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672Zm-7.518-.267A8.25 8.25 0 1 1 20.25 10.5M8.288 14.212A5.25 5.25 0 1 1 17.25 10.5" />
                      </svg>
                      Medijski presek
                  </h1>
                  
                  {/* --- GLAVA STRANI (Natančna replika slike image_dfed9f.png) --- */}
                  <p className="text-[13px] md:text-[14px] text-gray-500 dark:text-gray-400 mt-2.5 max-w-2xl leading-relaxed inline-block">
                    <strong className="text-gray-700 dark:text-gray-300">Ena novica. Več naslovov. <span className="text-gray-900 dark:text-white">Kdo pretirava?</span></strong> Strojna analiza medijskega poročanja razkriva informacijski šum, čustveni naboj ter novinarsko pristranskost.
                    <button 
                      onClick={() => setShowInfoModal(true)} 
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 ml-1.5 rounded-md bg-gray-100/80 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors text-[12px] focus:outline-none align-middle translate-y-[-1px]"
                    >
                      <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                      Kako deluje
                    </button>
                  </p>
                  {/* -------------------------------------------------------- */}

                </div>
                
                <div className="w-full md:w-auto flex flex-row-reverse md:flex-col items-center md:items-end justify-between md:justify-start gap-3 mt-3 md:mt-0">
                    {lastUpdated && (
                        <div className="text-[10px] md:text-[11px] font-mono text-gray-500 flex items-center gap-1.5 border border-gray-100 dark:border-gray-700 px-3 py-2 rounded bg-gray-50 dark:bg-gray-800/50 shrink-0">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 animate-ping"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand"></span>
                            </span>
                            Osveženo: {new Date(lastUpdated).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    )}
                    <Link href="/" className="px-3 py-1.5 border border-transparent rounded-md text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-brand transition-all flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                        Nazaj
                    </Link>
                </div>
            </div>
        </div>

        <div className="max-w-[1000px] mx-auto px-4 mt-8 md:mt-12">
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
  if (typeof content === 'string') { 
      try { 
          content = JSON.parse(content); 
      } catch (e) {
          console.error("Napaka pri parsiranju JSON analize v bazi:", e);
          content = null;
      } 
  }
  
  return { props: { analysis: Array.isArray(content) ? content : (content as any)?.data || null, lastUpdated: data.created_at }, revalidate: 60 }
}
