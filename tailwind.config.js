/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(220, 13%, 91%)',
        background: 'hsl(0, 0%, 100%)',
        foreground: 'hsl(224, 71%, 4%)',
        muted: 'hsl(220, 14%, 96%)',
        'muted-foreground': 'hsl(220, 9%, 46%)',
        primary: 'hsl(262, 83%, 58%)',
        'primary-foreground': 'hsl(210, 40%, 98%)',
        secondary: 'hsl(220, 14%, 96%)',
        'secondary-foreground': 'hsl(220, 9%, 46%)',
        accent: 'hsl(220, 14%, 96%)',
        'accent-foreground': 'hsl(220, 9%, 46%)',
        destructive: 'hsl(0, 84%, 60%)',
        'destructive-foreground': 'hsl(210, 40%, 98%)',
        ring: 'hsl(262, 83%, 58%)'
      }
    }
  },
  plugins: []
}
