/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0f',
          secondary: '#12121a',
          card: '#1a1a26',
          elevated: '#222233',
        },
        accent: {
          purple: '#7c3aed',
          blue: '#3b82f6',
          green: '#10b981',
          orange: '#f59e0b',
          red: '#ef4444',
          pink: '#ec4899',
        },
      },
    },
  },
  plugins: [],
}

