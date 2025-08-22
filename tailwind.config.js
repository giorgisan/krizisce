/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}', // če kdaj uporabljaš app router ali nove komponente
  ],
  theme: {
    extend: {
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
  plugins: [require('@tailwindcss/line-clamp')],
  // 🔒 Poskrbi, da Tailwind nikoli ne odreže teh razredov
  safelist: [
    'group',                             // ker se zanašamo na group-hover
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
