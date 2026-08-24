/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Blockletter', 'Anton', 'Impact', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        body: ['Inter', '-apple-system', 'sans-serif'],
      },
      colors: {
        slate: {
          950: '#0a0a0c',
          900: '#141418',
        },
        accent: {
          DEFAULT: '#00e5ff',
          hover: '#00b3cc',
          glow: 'rgba(0, 229, 255, 0.3)',
        }
      }
    },
  },
  plugins: [],
}
