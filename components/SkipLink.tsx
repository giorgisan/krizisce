// components/SkipLink.tsx
export default function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[1000] focus:bg-white/10 focus:text-white focus:ring-2 focus:ring-white/30 px-3 py-2 rounded"
    >
      Preskoči na vsebino
    </a>
  )
}
