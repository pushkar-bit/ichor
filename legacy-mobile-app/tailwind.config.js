/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Dhaav brand colors
        brand: {
          DEFAULT: '#A855F7',        // purple primary
          dark: '#7C3AED',           // purple dark
          light: '#C084FC',          // purple light
          muted: 'rgba(168, 85, 247, 0.15)',
        },
        surface: {
          DEFAULT: '#1A1A1A',
          elevated: '#242424',
          highlight: '#2E2E2E',
        },
        background: '#0D0D0D',
        border: '#333333',
        gold: '#D4AF37',
        flame: '#F97316',
        // Semantic
        clean: '#10B981',
        cheat: '#EF4444',
        neutral: '#A0A0A0',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
}
