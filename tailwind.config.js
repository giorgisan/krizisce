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
        sans: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
        serif: ['var(--font-playfair)', ...defaultTheme.fontFamily.serif],
      },
      // IZBRISAL SEM SEKCIJO fontWeight - pusti privzeto (700 za bold)!
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
    // Preveri, če rabiš line-clamp (v novejšem Tailwindu je vgrajen, ampak pusti če dela)
    require('@tailwindcss/line-clamp'),
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
