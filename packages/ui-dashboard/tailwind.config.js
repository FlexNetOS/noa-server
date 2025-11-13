/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0f172a',
          card: '#1e293b',
          accent: '#fbbf24',
          muted: '#94a3b8',
          border: '#334155',
          success: '#22c55e',
          warning: '#facc15',
          danger: '#ef4444',
          info: '#3b82f6',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-subtle': 'bounce 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
