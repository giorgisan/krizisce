"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";

const SOURCES = [
  { name: "RTVSLO", url: "https://www.rtvslo.si/" },
  { name: "24ur", url: "https://www.24ur.com/" },
  { name: "Siol.net", url: "https://siol.net/" },
  { name: "Slovenske novice", url: "https://www.slovenskenovice.si/" },
  { name: "Delo", url: "https://www.delo.si/" },
  { name: "Žurnal24", url: "https://www.zurnal24.si/" },
  { name: "N1", url: "https://n1info.si/" },
  { name: "Svet24", url: "https://novice.svet24.si/" },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const [open, setOpen] = useState(false);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Dinamični top za fixed overlay – panel bo vedno tik NAD gumbom
  const [panelTop, setPanelTop] = useState<number>(100);

  const recomputeTop = () => {
    const btn = buttonRef.current;
    const pnl = panelRef.current;
    if (!btn || !pnl) return;

    const btnRect = btn.getBoundingClientRect();
    const pnlRect = pnl.getBoundingClientRect();

    const top = window.scrollY + btnRect.top - pnlRect.height - 12; // 12px zračnosti
    setPanelTop(Math.max(8, top)); // ne dovoli izven zaslona
  };

  // Ko se overlay odpre, ga izmeri po renderju + ob resize/scroll
  useLayoutEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(recomputeTop); // počakaj na render
    const on = () => recomputeTop();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on);
    };
  }, [open]);

  // Zapri na ESC in klik izven
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  return (
    <footer className="relative bg-gray-900 text-gray-300 pt-12 pb-6 mt-8 border-t border-gray-800">
      {/* Zgornji trije stolpci – nespremenjeno */}
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-8">
        {/* Leva kolona */}
        <div className="flex-1">
          <div className="flex items-center mb-4">
            <img src="/logo.png" alt="Križišče" className="w-8 h-8 rounded-full mr-2" />
            <h4 className="text-white font-semibold text-lg">Križišče</h4>
          </div>
          <p className="text-sm font-normal leading-relaxed">
            Agregator najnovejših novic iz slovenskih medijev. <br />
            Članki so last izvornih portalov.
          </p>
        </div>

        <div className="hidden sm:block w-px bg-gray-800" />

        {/* Srednja kolona */}
        <div className="flex-1">
          <h4 className="text-white font-semibold mb-4">Povezave</h4>
          <ul className="space-y-2 text-sm font-normal">
            <li>
              <Link href="/projekt" className="hover:text-white transition">
                O projektu
              </Link>
            </li>
            <li>
              <Link href="/pogoji" className="hover:text-white transition">
                Pogoji uporabe
              </Link>
            </li>
          </ul>
        </div>

        <div className="hidden sm:block w-px bg-gray-800" />

        {/* Desna kolona */}
        <div className="flex-1">
          <h4 className="text-white font-semibold mb-4">Kontakt</h4>
          <p className="text-sm font-normal">
            <a href="mailto:gjkcme@gmail.com" className="hover:text-white transition">
              Pošljite nam sporočilo
            </a>
          </p>
        </div>
      </div>

      {/* SREDINSKI GUMB */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="flex justify-center">
          <button
            ref={buttonRef}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="sources-panel"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 ring-1 ring-white/10
                       text-gray-400 hover:text-white bg-gray-800/30 hover:bg-gray-800/50 transition"
          >
            {/* Diskretna ikona – tri pike */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              className="h-4 w-4 opacity-60"
            >
              <circle cx="12" cy="12" r="1.2" />
              <circle cx="6" cy="12" r="1.2" />
              <circle cx="18" cy="12" r="1.2" />
            </svg>
            <span className="text-sm font-medium">Viri</span>
          </button>
        </div>
      </div>

      {/* FIXED OVERLAY PANEL – lebdi nad vsebino; vedno na sredini, nad gumbom */}
      {open && (
        <div
          ref={panelRef}
          id="sources-panel"
          className="fixed left-1/2 -translate-x-1/2 z-[60]
                     w-[min(92vw,64rem)] rounded-2xl bg-gray-900/85 backdrop-blur
                     ring-1 ring-white/10 shadow-2xl p-4 sm:p-6 animate-fadeUp pointer-events-auto"
          style={{ top: panelTop }}
        >
          <p className="px-1 pb-3 text-[11px] uppercase tracking-wide text-gray-500 text-center">
            Viri novic
          </p>
          {/* Grid na sredino; brez max-height => nikoli scroll v panelu */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 justify-items-center">
            {SOURCES.map((it) => (
              <a
                key={it.name}
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2 py-2 rounded-lg text-gray-300
                           hover:text-white hover:bg-gray-800/60 transition"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gray-800/70
                                   text-[10px] font-semibold text-gray-300">
                  {it.name.slice(0, 2)}
                </span>
                <span className="text-sm">{it.name}</span>
                <span className="ml-auto text-xs text-gray-500">↗</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Spodnji trak */}
      <div className="border-t border-gray-800 mt-12 pt-4 text-center text-sm font-normal text-gray-500">
        <p className="italic mb-2">
          “Informacija ni znanje. Edino razumevanje šteje.” – Albert Einstein
        </p>
        <p>© {year} Križišče – Vse pravice pridržane.</p>
      </div>

      {/* Animacija */}
      <style jsx>{`
        @keyframes fadeUp {
          0% {
            opacity: 0;
            transform: translate(-50%, 12px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
        .animate-fadeUp {
          animation: fadeUp 0.28s cubic-bezier(0.2, 0.6, 0.2, 1) both;
        }
      `}</style>
    </footer>
  );
}
