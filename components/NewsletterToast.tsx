import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function NewsletterToast() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [isDismissedState, setIsDismissedState] = useState(true);

  useEffect(() => {
    setHasMounted(true);
    const dismissed = localStorage.getItem('newsletter_dismissed');
    
    // Če še ni bil zaprt, ga prikažemo po 4 sekundah
    if (!dismissed) {
      setIsDismissedState(false);
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 4000); 
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault(); // Prepreči klik na sam Link, ko kliknemo na X
    e.stopPropagation();
    setIsVisible(false);
    localStorage.setItem('newsletter_dismissed', 'true');
    setIsDismissedState(true);
  };

  // Če še nismo mounted na clientu ali je bil widget že zaprt, ne renderiramo ničesar
  if (!hasMounted || isDismissedState) return null;

  return (
    <div
      className={`fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 transform transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'
      }`}
    >
      {/* Plavajoča "tabletka" (Floating Pill)
        Klik nanjo te pelje na /pregled
      */}
      <Link 
        href="/pregled"
        onClick={() => setIsVisible(false)}
        className="group relative flex items-center gap-3 bg-white/95 dark:bg-[#151a25]/95 backdrop-blur-xl pl-4 pr-10 py-3 rounded-full shadow-2xl shadow-brand/10 border border-gray-200/60 dark:border-gray-800 hover:border-brand/40 dark:hover:border-brand/30 transition-all hover:scale-[1.02]"
      >
        <div className="flex-shrink-0 bg-brand/10 dark:bg-brand/20 p-1.5 rounded-full text-brand group-hover:scale-110 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <span className="font-bold text-gray-900 dark:text-white text-[13px] sm:text-[14px]">
          Jutranji pregled <span className="inline-block ml-0.5">☕</span>
        </span>
        
        <span className="hidden sm:inline-block ml-1 text-[13px] font-medium text-gray-500 dark:text-gray-400 group-hover:text-brand transition-colors">
          • Poglejte zadnjega
        </span>

        {/* Gumb za zapiranje (X) znotraj tabletke */}
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Skrij obvestilo"
          title="Ne prikaži več"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </Link>
    </div>
  );
}
