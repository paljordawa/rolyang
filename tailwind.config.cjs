module.exports = {
  content: ['./src/**/*.{astro,html,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#6366f1',
          secondary: '#a855f7',
          accent: '#c084fc',
        },
        surface: {
          base: '#0a0b10',
          panel: '#15171e',
          glass: 'rgba(255, 255, 255, 0.03)',
        }
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    }
  },
  plugins: [],
};
