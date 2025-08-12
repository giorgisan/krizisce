"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/* Nežna ikona signpost/križišče (inline SVG) */
function IconSignpost(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3v18" />
      <path d="M5 6h9l-2.5 3H5z" />
      <path d="M19 14h-9l2.5-3H19z" />
    </svg>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();
  const [open, setOpen] = useState(false);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef  = useRef<HTMLDivElement | null>(null);

  // null => fallback center (prvi frame z animacijo); številka => natančen top nad gumbom
  const [panelTop, setPanelTop] = useState<number | null>(null);

  const positionPanelOverButton = () => {
    const btn = buttonRef.current;
    const pnl = panelRef.current;
    if (!btn || !pnl) return;
    const btnRect = btn.getBoundingClientRect();
    const pnlRect = pnl.getBoundingClientRect();
    const GAP = 16; // razmak nad gumbom
    const top = window.scrollY + btnRect.top - pnlRect.height - GAP;
    setPanelTop(Math.max(12, top));
  };

  // ob odprtju: prikaži center + animacijo, nato v dvojnem RAF-u izmeri in premakni nad gumb
  useLayoutEffect(() => {
    if (!open) return;
    setPanelTop(null);
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(positionPanelOverButton);
      // cleanup inner raf
      return () => cancelAnimationFrame(id2);
    });
    const on = () => positionPanelOverButton();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      cancelAnimationFrame(id1);
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on);
    };
  }, [open]);

  // ESC zapre
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <footer className="relative bg-gray-900 text-gray-300 pt-12 pb-6 mt-8 border-t border-gray-800">
      {/* Zgornji trije stolpci */}
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-8">
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

        <div className="flex-1">
          <h4 className="text-white font-semibold mb-4">Povezave</h4>
          <ul className="space-y-2 text-sm font-normal">
            <li><Link href="/projekt" className="hover:text-white transition">O projektu</Link></li>
            <li><Link href="/pogoji" className="hover:text-white transition">Pogoji uporabe</Link></li>
          </ul>
        </div>

        <div className="hidden sm:block w-px bg-gray-800" />

        <div className="flex-1">
          <h4 className="text-white font-semibold mb-4">Kontakt</h4>
          <p className="text-sm font-normal">
            <a href="mailto:gjkcme@gmail.com" className="hover:text-white transition">
              Pošljite nam sporočilo
            </a>
          </p>
        </div>
      </div>

      {/* Sredinski gumb */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="flex justify-center">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 ring-1 ring-white/10
                       text-gray-300 hover:text-white bg-gray-800/30 hover:bg-gray-800/50 transition"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls="sources-panel"
          >
            <IconSignpost className="h-4 w-4 opacity-80" />
            <span className="text-sm font-medium">Viri</span>
          </button>
        </div>
      </div>

      {/* Overlay (portal) – scrim + panel nad gumbom */}
      {open && (
        <Portal>
          <div
            className="fixed inset-0 z-[200] pointer-events-auto"
            role="dialog"
            aria-modal="true"
            onMouseDown={() => setOpen(false)}
          >
            {/* nežen scrim */}
            <div className="absolute inset-0 bg-black/20" />

            {/* PANEL: animacija samo v fallback centru; po izračunu brez animacije */}
            <div
              ref={panelRef}
              id="sources-panel"
              className={`fixed left-1/2 w-[min(92vw,64rem)] rounded-2xl bg-gray-900/85 backdrop-blur
                          ring-1 ring-white/10 shadow-2xl p-4 sm:p-6 pointer-events-auto
                          ${panelTop === null ? "animate-fadeUp" : ""}`}
              style={
                panelTop === null
                  ? { top: "50%", transform: "translate(-50%, -50%)" } // prvi frame (center + anim)
                  : { top: panelTop, transform: "translateX(-50%)" }   // natančna pozicija nad gumbom
              }
              onMouseDown={(e) => e.stopPropagation()}
            >
              <p className="px-1 pb-3 text-[11px] uppercase tracking-wide text-gray-500 text-center">
                Viri novic
              </p>
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
          </div>

          {/* animacija (samo za fallback center) */}
          <style jsx global>{`
            @keyframes fadeUp {
              0% { opacity: 0; transform: translate(-50%, -46%) scale(0.985); }
              100%{ opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            .animate-fadeUp { animation: fadeUp .28s cubic-bezier(.2,.6,.2,1) both; }
          `}</style>
        </Portal>
      )}

      {/* Spodnji trak */}
      <div className="border-t border-gray-800 mt-12 pt-4 text-center text-sm font-normal text-gray-500">
        <p className="italic mb-2">
          “Informacija ni znanje. Edino razumevanje šteje.” – Albert Einstein
        </p>
        <p>© {year} Križišče – Vse pravice pridržane.</p>
      </div>
    </footer>
  );
}
