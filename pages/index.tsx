// pages/index.tsx

import { NewsItem } from '@/types'
import fetchRSSFeeds from '@/lib/fetchRSSFeeds'
import Footer from '@/components/Footer'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo, useEffect, useRef } from 'react'
import { SOURCES, sourceColors } from '@/lib/sources'
import Link from 'next/link'

type Props = { initialNews: NewsItem[] }

/* =========================
   Inline komponenta: SourcesMenu
   ========================= */
type SourceLink = { name: string; url: string }

const SOURCE_LINKS: SourceLink[] = [
  { name: 'RTVSLO',            url: 'https://www.rtvslo.si' },
  { name: '24ur',              url: 'https://www.24ur.com' },
  { name: 'Siol.net',          url: 'https://siol.net' },
  { name: 'Slovenske novice',  url: 'https://www.slovenskenovice.si' },
  { name: 'Delo',              url: 'https://www.delo.si' },
  { name: 'Zurnal24',          url: 'https://www.zurnal24.si' },
  { name: 'N1',                url: 'https://n1info.si' },
  { name: 'Svet24',            url: 'https://www.svet24.si' },
]

function SourcesMenu({ items, className = '' }: { items: SourceLink[]; className?: string }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Viri novic"
        onClick={() => setOpen(v => !v)}
        className="relative h-9 w-9 rounded-full bg-gray-800/70 ring-1 ring-white/10 hover:bg-gray-700 text-white grid place-items-center transition"
      >
        {/* 3 krogci v počasni orbiti */}
        <span className="relative block h-5 w-5">
          <span className="absolute inset-0 animate-spin-slow">
            <span className="absolute left-1/2 top-0 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-white/80" />
            <span className="absolute right-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-white/70" />
            <span className="absolute left-1/2 bottom-0 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-white/60" />
          </span>
        </span>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          tabIndex={-1}
          className="absolute right-0 mt-2 w-64 max-h-80 overflow-auto rounded-xl bg-gray-900/95 backdrop-blur shadow-xl ring-1 ring-white/10 p-2 z-50"
        >
          <p className="px-2 pb-2 text-xs uppercase tracking-wide text-gray-400">Viri novic</p>
          <div className="grid gap-1">
            {items.map(it => (
              <a
                key={it.name}
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800 text-gray-200"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gray-700 text-[10px] font-bold">
                  {it.name.slice(0, 2)}
                </span>
                <span className="text-sm">{it.name}</span>
                <span className="ml-auto text-xs text-gray-400">↗</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .animate-spin-slow { animation: spin 6s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

/* =========================
   Page
   ========================= */
export default function Home({ initialNews }: Props) {
  const [filter, setFilter] = useState<string>('Vse')
  const [displayCount, setDisplayCount] = useState<number>(20)
  const [hasFresh, setHasFresh] = useState(false)

  // filter bar (touch scroll na mobiju, puščici na desktopu)
  const filterRef = useRef<HTMLDivElement | null>(null)
  const [showLeft, setShowLeft]   = useState(false)
  const [showRight, setShowRight] = useState(false)
  const [alignEnd, setAlignEnd]   = useState(true) // desno poravnano, ko NI overflowa

  // podatki
  const sortedNews = useMemo(
    () => [...initialNews].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()),
    [initialNews]
  )
  const filteredNews = filter === 'Vse' ? sortedNews : sortedNews.filter(a => a.source === filter)
  const visibleNews  = filteredNews.slice(0, displayCount)

  // fresh check
  useEffect(() => {
    const latest = initialNews?.[0]?.pubDate
    if (!latest) return
    const check = async () => {
      try {
        const res = await fetch('/api/news?forceFresh=1', { cache: 'no-store' })
        const fresh = await res.json()
        if (Array.isArray(fresh) && fresh.length) {
          if (new Date(fresh[0].pubDate).getTime() > new Date(latest).getTime()) setHasFresh(true)
        }
      } catch { /* ignore */ }
    }
    check()
  }, [initialNews])

  // overflow/puščice/poravnava (desktop), touch scroll (mobile)
  useEffect(() => {
    const el = filterRef.current
    if (!el) return
    const update = () => {
      const mqDesktop = window.matchMedia('(min-width: 640px)')
      if (!mqDesktop.matches) {
        // mobilni: brez puščic, touch scroll
        setShowLeft(false); setShowRight(false); setAlignEnd(false)
        return
      }
      const scrollLeft  = Math.ceil(el.scrollLeft)
      const clientWidth = Math.ceil(el.clientWidth)
      const scrollWidth = Math.ceil(el.scrollWidth)
      const overflow = scrollWidth - clientWidth > 2
      setShowLeft (overflow && scrollLeft > 0)
      setShowRight(overflow && scrollLeft + clientWidth < scrollWidth - 1)
      setAlignEnd(!overflow)
    }
    update()
    el.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    const ro = new ResizeObserver(update)
    ro.observe(el); Array.from(el.children).forEach(c => ro.observe(c as Element))
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update); ro.disconnect() }
  }, [])

  const scrollBy = (dx: number) => filterRef.current?.scrollBy({ left: dx, behavior: 'smooth' })
  const handleLoadMore = () => setDisplayCount(p => p + 20)

  return (
    <>
      <main className="min-h-screen bg-gray-900 text-white px-4 md:px-8 lg:px-16 py-8">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-gray-900/70 backdrop-blur-md border-b border-gray-800 py-2 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-2 sm:px-4">
            {/* Logo + osvežitev + viri */}
            <div className="flex items-center space-x-3 sm:space-x-5">
              <Link href="/">
                <div className="flex items-center space-x-3 cursor-pointer">
                  <img src="/logo.png" alt="Križišče"
                       className="w-10 h-10 rounded-full transition hover:scale-105 hover:shadow-lg" />
                  <div>
                    <h1 className="text-2xl font-bold leading-tight">Križišče</h1>
                    <p className="text-xs text-gray-400">Najnovejše novice slovenskih medijev</p>
                  </div>
                </div>
              </Link>

              {/* osveži (zelena pika skrita na mobiju) */}
              <button
                onClick={() => location.reload()}
                aria-label="Osveži stran"
                className="relative p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-transform hover:rotate-180"
              >
                {hasFresh && (
                  <span className="hidden sm:inline-block absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-gray-900" />
                )}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path stroke="none" d="M0 0h24v24H0z" />
                  <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
                  <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
                </svg>
              </button>

              {/* Viri – animiran gumb z dropdownom */}
              <SourcesMenu items={SOURCE_LINKS} />
            </div>

            {/* Filtri – touch scroll (mobile), puščici (desktop) */}
            <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
              {/* leva puščica – samo desktop */}
              {showLeft && (
                <button
                  onClick={() => scrollBy(-220)}
                  aria-label="Premakni levo"
                  className="hidden sm:flex items-center justify-center p-2 text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" strokeWidth="2"
                       strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
              )}

              <div
                ref={filterRef}
                className={[
                  'flex flex-nowrap items-center overflow-x-auto scrollbar-hide',
                  'gap-2 pb-1',
                  alignEnd ? 'sm:justify-end' : ''
                ].join(' ')}
                style={{ scrollBehavior: 'smooth' }}
              >
                {SOURCES.map(source => (
                  <button
                    key={source}
                    onClick={() => { setFilter(source); setDisplayCount(20) }}
                    className={`relative px-3 py-1 rounded-full text-sm transition font-medium whitespace-nowrap ${
                      filter === source ? 'text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {filter === source && (
                      <motion.div
                        layoutId="bubble"
                        className="absolute inset-0 rounded-full bg-brand z-0"
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      />
                    )}
                    <span className="relative z-10">{source}</span>
                  </button>
                ))}
              </div>

              {/* desna puščica – samo desktop */}
              {showRight && (
                <button
                  onClick={() => scrollBy(220)}
                  aria-label="Premakni desno"
                  className="hidden sm:flex items-center justify-center p-2 text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" strokeWidth="2"
                       strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Grid novic */}
        {visibleNews.length === 0 ? (
          <p className="text-gray-400 text-center w-full mt-10">Ni novic za izbrani vir ali napaka pri nalaganju.</p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
            >
              {visibleNews.map((article, i) => {
                const formattedDate = new Date(article.pubDate).toLocaleString('sl-SI')
                const color = sourceColors[article.source] || '#fc9c6c'
                return (
                  <a
                    href={article.link}
                    key={i}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-800 hover:bg-gray-700 rounded-xl shadow-md overflow-hidden flex flex-col transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl"
                  >
                    {article.image && (
                      <img src={article.image} alt={article.title} className="w-full h-32 sm:h-40 object-cover" loading="lazy" />
                    )}
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-1">
                        <span className="text-sm font-semibold" style={{ color }}>{article.source}</span>
                        <span className="text-xs text-gray-400 mt-1 sm:mt-0 sm:ml-2">{formattedDate}</span>
                      </div>
                      <h2 className="text-base font-semibold mb-1 leading-tight line-clamp-3 sm:line-clamp-3">
                        {article.title}
                      </h2>
                      <p className="text-sm text-gray-400 line-clamp-4 sm:line-clamp-4">
                        {article.contentSnippet}
                      </p>
                    </div>
                  </a>
                )
              })}
            </motion.div>
          </AnimatePresence>
        )}

        {displayCount < filteredNews.length && (
          <div className="text-center mt-8">
            <button onClick={handleLoadMore} className="px-5 py-2 bg-brand text-white rounded-full hover:bg-brand-hover transition">
              Naloži več
            </button>
          </div>
        )}
      </main>

      <Footer />

      {/* Skrij horizontalni scrollbar (Chrome/Safari/FF) */}
      <style jsx>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  )
}

// ISR – 1 minuta
export async function getStaticProps() {
  const initialNews = await fetchRSSFeeds()
  return { props: { initialNews }, revalidate: 60 }
}
