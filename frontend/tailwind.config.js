/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mcu: {
          dark: '#0B0F19',
          card: '#161F30',
          accent: '#8B0000',
          gold: '#E5A93C',
          cyan: '#38BDF8',
        },
      },
    },
  },
  plugins: [],
}
