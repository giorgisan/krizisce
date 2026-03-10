import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

// --- KOMPONENTA ZA PRIKAZ PODATKOV ---
function VisitorData() {
  const [info, setInfo] = useState({
    browser: '...',
    os: '...',
    screen: '...',
    location: '...',
    ip: '...'
  })

  useEffect(() => {
    const ua = window.navigator.userAgent
    let os = 'Neznano'
    if (ua.indexOf('Win') !== -1) os = 'Windows'
    if (ua.indexOf('Mac') !== -1) os = 'MacOS'
    if (ua.indexOf('Linux') !== -1) os = 'Linux'
    if (ua.indexOf('Android') !== -1) os = 'Android'
    if (ua.indexOf('like Mac') !== -1) os = 'iOS (iPhone/iPad)'

    let browser = 'Neznano'
    if (ua.indexOf('Chrome') !== -1) browser = 'Chrome'
    if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) browser = 'Safari'
    if (ua.indexOf('Firefox') !== -1) browser = 'Firefox'
    if (ua.indexOf('Edg') !== -1) browser = 'Edge'

    const screenRes = `${window.screen.width} x ${window.screen.height}`
    setInfo(prev => ({ ...prev, os, browser, screen: screenRes }))

    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        setInfo(prev => ({
          ...prev,
          location: `${data.city}, ${data.country_name}`,
          ip: data.ip
        }))
      })
      .catch(() => {
        setInfo(prev => ({ ...prev, location: 'Neznano (Blokirano?)', ip: '-' }))
      })
  }, [])

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-brand/20 bg-brand/5 dark:bg-brand/10 shadow-sm">
      <div className="bg-brand/10 px-4 py-3 border-b border-brand/20 flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-dark dark:text-brand flex items-center gap-2">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
           </svg>
           Vaš digitalni odtis
        </span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/50 dark:bg-black/20 rounded-full border border-brand/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[10px] font-bold uppercase text-brand-dark/70 dark:text-brand/80 tracking-wide">
              Prikaz v živo
            </span>
        </div>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide font-semibold">Vaša lokacija (IP)</div>
          <div className="font-mono font-medium text-lg text-gray-900 dark:text-white truncate" title={info.location}>{info.location}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide font-semibold">Vaša naprava</div>
          <div className="font-mono font-medium text-lg text-gray-900 dark:text-white truncate">{info.os}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide font-semibold">Brskalnik</div>
          <div className="font-mono font-medium text-lg text-gray-900 dark:text-white truncate">{info.browser}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide font-semibold">Zaslon</div>
          <div className="font-mono font-medium text-lg text-gray-900 dark:text-white truncate">{info.screen}</div>
        </div>
      </div>
      <div className="px-4 py-3 bg-white/60 dark:bg-black/20 text-xs text-center text-gray-600 dark:text-gray-400 italic border-t border-brand/10">
        Teh podatkov <strong>ne shranjujemo</strong>. Prikazujemo jih le zato, da vidite, kaj vaš brskalnik samodejno sporoča spletnim stranem.
      </div>
    </div>
  )
}

// --- GLAVNA STRAN ---
export default function Zasebnost() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <Header />
      <main className="flex-grow w-full max-w-[1800px] mx-auto px-4 md:px-8 lg:px-16 py-12 text-gray-900 dark:text-white">
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-8">Vaša zasebnost je zagotovljena</h1>

            <div className="text-lg leading-relaxed text-gray-600 dark:text-gray-300 space-y-6">
                <p>
                  Pri portalu <strong>Križišče</strong> verjamemo, da mora biti branje novic sproščeno in varno. Zato smo stran zgradili tako, da spoštuje vašo anonimnost. 
                </p>
                <p>
                  Ne zahtevamo registracije in vas ne zasledujemo z oglasnimi piškotki. 
                </p>

                <VisitorData />

                <div className="bg-gray-50 dark:bg-gray-800 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm mt-8">
                  <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-2xl">🛡️</span> Brez piškotkov, brez skrbi
                  </h2>
                  <p className="mb-6 text-sm opacity-90 leading-relaxed">
                    Za razliko od večine spletnih mest, Križišče <strong>ne uporablja piškotkov za sledenje</strong>. Ko zapustite našo stran, ne vemo več, kdo ste in kje ste bili.
                  </p>
                  
                  <ul className="space-y-4 mb-8">
                    <li className="flex gap-3 items-start">
                      <div className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold text-sm">✓</div>
                      <div className="text-base">
                        <strong>E-Novičnik (Newsletter):</strong> Edini osebni podatek, ki ga hranimo, je vaš e-mail naslov, <em>če se sami odločite</em> za prijavo na naš novičnik. Uporabljamo ga izključno za pošiljanje pregleda novic. Odjavite se lahko kadarkoli, s čimer se vaš naslov trajno izbriše.
                      </div>
                    </li>
                    <li className="flex gap-3 items-start">
                      <div className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold text-sm">✓</div>
                      <div className="text-base">
                        <strong>Umetna inteligenca (AI):</strong> Umetno inteligenco uporabljamo izključno za obdelavo javno dostopnih novic (kategorizacija, povzetki). Vaši osebni podatki se modelom umetne inteligence <strong>nikoli</strong> ne posredujejo.
                      </div>
                    </li>
                    <li className="flex gap-3 items-start">
                      <div className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold text-sm">✓</div>
                      <div className="text-base">
                        <strong>Prijazna statistika:</strong> Uporabljamo orodje <em>Umami Analytics</em>, ki je zasnovano za zasebnost. Beležimo le splošne številke (npr. število obiskovalcev), ne pa, kdo ti obiskovalci so.
                      </div>
                    </li>
                  </ul>

                  <div className="flex gap-3 p-4 rounded-lg bg-gray-200/30 dark:bg-gray-700/30 items-start text-sm text-gray-700 dark:text-gray-300">
                      <div className="shrink-0 text-gray-500 dark:text-gray-400 pt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="leading-relaxed opacity-90">
                        <strong>Dobro je vedeti:</strong> Križišče je agregator. Ko kliknete na naslov novice, vas preusmerimo na spletno stran izvornega medija (npr. RTV, 24ur, Delo ...). Na njihovih straneh veljajo njihova pravila zasebnosti.
                      </div>
                  </div>
                </div>
            </div>

            <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800">
                <Link href="/" className="group text-brand font-medium inline-flex items-center gap-2 transition-colors hover:text-brand-dark">
                    <span className="transition-transform group-hover:-translate-x-1">←</span> Nazaj na glavno stran
                </Link>
            </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
