/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Tajawal', 'sans-serif'],
        body: ['Cairo', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f8f9fa',
          900: '#0A0E1A',
        },
        accent: {
          400: '#D4AF37',
          500: '#C4A12E',
          600: '#B49425',
        },
        surface: {
          800: '#1A1F2E',
          900: '#0F1420',
        }
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      }
    }
  }
};
