// components/SourcesMenu.tsx
import { useEffect, useRef, useState } from "react"

type Item = { name: string; url: string }

type Props = {
  items: Item[]
  className?: string
}

export default function SourcesMenu({ items, className = "" }: Props) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // zapri na klik izven
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) {
        setOpen(false)
      }
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onEsc)
    }
  }, [open])

  return (
    <div className={`container relative ${className}`}>
      {/* Gumb z vrtečimi se krogci */}
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Viri novic"
        onClick={() => setOpen((v) => !v)}
        className="relative h-9 w-9 rounded-full bg-gray-800/70 ring-1 ring-white/10 hover:bg-gray-700 text-white grid place-items-center transition"
      >
        {/* 3 krogci v orbiti – nežna animacija */}
        <span className="relative block h-5 w-5">
          <span className="absolute inset-0 animate-spin-slow">
            <span className="absolute left-1/2 top-0 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-white/80" />
            <span className="absolute right-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-white/70" />
            <span className="absolute left-1/2 bottom-0 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-white/60" />
          </span>
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          tabIndex={-1}
          className="absolute right-0 mt-2 w-64 max-h-80 overflow-auto rounded-xl bg-gray-850/95 backdrop-blur shadow-xl ring-1 ring-white/10 p-2 z-50"
        >
          <p className="px-2 pb-2 text-xs uppercase tracking-wide text-gray-400">
            Viri novic
          </p>
          <div className="grid gap-1">
            {items.map((it) => (
              <a
                key={it.name}
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-750 text-gray-200"
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

      {/* lokalni stil za animacijo + temni odtenki */}
      <style jsx>{`
        .animate-spin-slow {
          animation: spin 6s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .bg-gray-850 {
          background-color: rgb(26, 30, 36);
        }
        .bg-gray-750 {
          background-color: rgb(45, 51, 59);
        }
      `}</style>
    </div>
  )
}
