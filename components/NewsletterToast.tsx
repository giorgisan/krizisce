import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';

export default function NewsletterToast() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setHasMounted(true);
    const isDismissed = localStorage.getItem('newsletter_dismissed');
    
    if (!isDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000); 
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('newsletter_dismissed', 'true');
  };

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Prišlo je do napake.');
      
      setStatus('success');
      setMsg(data.message);
      setEmail('');
      
      setTimeout(() => {
        handleDismiss();
      }, 3000);

    } catch (err: any) {
      setStatus('error');
      setMsg(err.message);
    }
  };

  if (!hasMounted) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-[calc(100vw-2rem)] sm:max-w-sm w-full 
      bg-white/95 dark:bg-[#151a25]/95 backdrop-blur-xl 
      rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/80 p-4 sm:p-5 
      transform transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'
      }`}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
        aria-label="Zapri"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3 mb-2.5">
        <div className="flex-shrink-0 bg-brand/10 dark:bg-brand/20 p-2 rounded-full text-brand">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-[14px] leading-tight mb-0.5">
            Jutranji pregled ☕
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-snug pr-4">
            Zbudite se z najodmevnejšimi novicami v vašem nabiralniku. Prijavite se na brezplačni pregled najpomembnejših novic vsako jutro.
          </p>
        </div>
      </div>

      {status === 'success' ? (
        <div className="text-xs text-green-700 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-3 py-3 rounded-lg border border-green-200 dark:border-green-800/30 text-center animate-pulse">
          {msg}
        </div>
      ) : (
        <form onSubmit={handleSubscribe} className="flex flex-col gap-2.5">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Vaš e-naslov..."
              required
              disabled={status === 'loading'}
              className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={status === 'loading' || !email}
              className="shrink-0 rounded-lg bg-brand hover:opacity-85 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? '...' : 'Prijavi se'}
            </button>
          </div>
          
          <p className="text-[9px] text-gray-400 dark:text-gray-500 leading-tight">
            S prijavo se strinjate s prejemanjem e-novic. Vaše e-pošte ne bomo nikoli tržili ali delili.
            {status === 'error' && <span className="block text-red-500 mt-1 font-medium">{msg}</span>}
          </p>
        </form>
      )}

      {status !== 'success' && (
        <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800/60 text-center">
          <Link 
            href="/pregled" 
            onClick={() => setIsVisible(false)}
            className="inline-flex items-center justify-center text-[10.5px] font-medium text-gray-400 hover:text-brand transition-colors group"
          >
            Preverite, kako izgleda današnji 'Jutranji pregled' <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
