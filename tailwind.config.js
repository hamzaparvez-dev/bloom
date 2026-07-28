/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bloom: {
          pink: '#E8608C',
          bg: '#FFF4F7',
          surface: '#FCEDEA',
          headerBg: '#FCEDF4',
          dark: '#190F2D',
          muted: '#5B5470',
          border: '#EDE8F4',
          inputBg: '#FFFFFF',
          selectedBg: '#FCEDEA',
          purple: '#8B5CF6',
          green: '#10B981',
        },
      },
      fontFamily: {
        inter: ['Inter'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
        'full': '28px',
        'device': '44px',
      },
    },
  },
  plugins: [],
};
