/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // WCAG AA denetimi (Faz 1): koyu zeminde slate-500 (4.18:1) ve
        // slate-600 (2.63:1) eşiklerin altındaydı. Yalnız metinde kullanıldıkları
        // için tone override'ı ile 55 kullanım tek seferde AA'ya çekildi.
        slate: {
          500: '#74849b', // 5.23:1 on #08090d
          600: '#6e7f96', // 4.87:1 on #08090d
          700: '#6b7c94', // ~4.6:1 — kilitli/înactive etiket + dekoratif ayırıcı
        },
        dark: {
          950: '#07090e',
          900: '#0d1117',
          850: '#131822',
          800: '#1b2230',
          700: '#283347',
        },
        quantum: {
          blue: '#00f0ff',
          violet: '#a855f7',
          amber: '#f59e0b',
          emerald: '#10b981',
          crimson: '#f43f5e'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Display: oyunun imza öğesi (hero Dopamin sayacı) — cyberpunk/k HUD karakteri
        display: ['Chakra Petch', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 240, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
