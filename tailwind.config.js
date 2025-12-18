/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
      },
      // --- TUKAJ JE ČAROVNIJA ZA POVRNITEV STAREGA VIDEZA ---
      // To preglasi privzete debeline. Ko v kodi uporabiš 'font-bold',
      // bo zdaj uporabil debelino 600 (SemiBold) namesto 700.
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '600', // <--- SPREMEMBA: font-bold zdaj uporablja 600 (tanjše)
        extrabold: '700', // font-extrabold uporablja 700
        black: '800',
      },
      // -----------------------------------------------------
      colors: {
        brand: '#fc9c6c',
        'brand-hover': '#e57b53',
      },
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
        },
      },
      animation: {
        'bounce-subtle': 'bounce-subtle 0.25s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
  safelist: [
    'group',
    'md:opacity-0',
    'md:scale-95',
    'md:-translate-y-0.5',
    'md:group-hover:opacity-100',
    'md:group-hover:scale-110',
    'md:group-hover:translate-y-0',
    'hover:scale-110',
    'transition-transform',
    'transition-opacity',
  ],
}
