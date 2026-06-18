/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#E85D32', light: '#FFF0E8', dark: '#B83B1B', 50: '#FFF7F2', 100: '#FFE3D4', 500: '#F4774E', 600: '#E85D32', 700: '#B83B1B' },
        success: '#16A34A',
        warning: '#D97706',
        error: '#DC2626',
        surface: '#F4F1E9',
      },
      fontFamily: { sans: ['Manrope', 'system-ui', 'sans-serif'], display: ['DM Serif Display', 'Georgia', 'serif'], mono: ['IBM Plex Mono', 'Consolas', 'monospace'] },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'pulse-ring': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
        fadeIn: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
