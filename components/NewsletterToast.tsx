import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function NewsletterToast() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    // Preverimo, če je uporabnik to obvestilo že kdaj zaprl
    const isDismissed = localStorage.getItem('newsletter_dismissed');
    
    if (!isDismissed) {
      // Prikažemo šele po 5 sekundah, da ne presenetimo uporabnika takoj ob nalaganju
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000); 

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Zapišemo v brskalnik, da ga ne prikažemo nikoli več
    localStorage.setItem('newsletter_dismissed', 'true');
  };

  // Preprečimo "hydration mismatch" pri Next.js
  if (!hasMounted) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-[calc(100vw-2rem)] sm:max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 transform transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'
      }`}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors p-1"
        aria-label="Zapri"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 bg-orange-100 p-2.5 rounded-full text-orange-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <div>
          <h3 className="font-bold text-gray-900 text-sm mb-1">
            Novost: Jutranji pregled ☕
          </h3>
          <p className="text-gray-600 text-xs leading-relaxed mb-3 pr-2">
            Zbudite se z najodmevnejšimi novicami naravnost v vaš nabiralnik.
          </p>
          
          <div className="flex gap-3">
            <Link 
              href="/pregled" 
              onClick={() => setIsVisible(false)} // Skrijemo, če klikne na povezavo
              className="text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors"
            >
              Oglejte si zadnje objavljene e-novice 
            </Link>
            <button 
              onClick={handleDismiss}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors px-2"
            >
              Ne, hvala
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
