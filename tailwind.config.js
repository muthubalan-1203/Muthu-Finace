/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E6F5F1',
          100: '#B3E2D6',
          200: '#80CEBB',
          300: '#4DBA9F',
          400: '#26AB89',
          500: '#17B890',
          600: '#0F6E5E',
          700: '#0B5448',
          800: '#073A33',
          900: '#04211D',
        },
        cream: {
          DEFAULT: '#F7F5EF',
          50: '#FDFCFA',
          100: '#FAF9F5',
          200: '#F7F5EF',
          300: '#EDE9DD',
          400: '#E3DDCB',
        },
        ink: {
          DEFAULT: '#0B1210',
          50: '#E8EAEA',
          100: '#C5C9C8',
          200: '#9FA5A3',
          300: '#79807E',
          400: '#5D6563',
          500: '#414A48',
          600: '#2B3432',
          700: '#1E2725',
          800: '#141C1A',
          900: '#0B1210',
        },
      },
      fontFamily: {
        display: ['Manrope', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
        'card-dark': '0 1px 3px 0 rgba(0,0,0,0.3), 0 1px 2px -1px rgba(0,0,0,0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pop-in': 'popIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
