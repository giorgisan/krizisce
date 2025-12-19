/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')

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
        // Inter za UI, navigacijo in meta podatke
        sans: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
        // Playfair Display SAMO za naslove
        serif: ['var(--font-playfair)', ...defaultTheme.fontFamily.serif],
      },
      // --- OPTIMIZACIJA DEBELINE (Weight Mapping) ---
      // To prepreči, da bi naslovi izgledali preveč "okorno" v Firefoxu
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '600',      // Trik: font-bold zdaj uporabi SemiBold (600)
        extrabold: '700', // font-extrabold uporabi Bold (700)
        black: '800',
      },
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
    // Dodaj tole, če želiš lepše scroolbary (kot sem videl v tvojem CSS)
    require('tailwind-scrollbar-hide'), 
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
