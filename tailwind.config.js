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
      // --- TUKAJ JE KLJUČNO ---
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
      },
      // ------------------------
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
  // ... ostale nastavitve (safelist itd.)
}
