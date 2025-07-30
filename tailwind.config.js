/* tailwind.config.js */
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#fc9c6c',
        'brand-hover': '#e57b53',
        secondary: '#3B82F6',
        success: '#10B981',
        error: '#DC2626',
        'bg-light': '#F5F5F5',
        'bg-dark': '#0D0D0D',
        'text-light': '#1F2937',
        'text-dark': '#E5E7EB',
      },
    },
  },
  plugins: [],
}
