/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6D28D9', // Royal Purple
          light: '#A78BFA', // Lavender
          dark: '#4C1D95',
        },
        accent: '#22D3EE', // Electric Cyan
        background: '#0F172A', // Matte Black (Slate 900ish)
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
