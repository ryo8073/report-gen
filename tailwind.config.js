/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Hiragino Sans', 'Yu Gothic', 'Meiryo', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
