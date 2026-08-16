/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nikke: {
          bg: '#0c0e14',
          card: '#131722',
          surface: '#1a1f2e',
          border: '#283046',
          accent: '#ff5e1f',
          gold: '#f59e0b',
          cyan: '#06b6d4',
          success: '#10b981',
          text: '#f1f5f9',
          muted: '#94a3b8'
        }
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
