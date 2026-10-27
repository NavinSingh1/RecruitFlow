export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Figtree', 'system-ui', 'sans-serif'] },
      colors: {
        pine: { 50: '#EEF5F4', 100: '#D6E8E6', 600: '#1F6F6B', 700: '#175754', 800: '#0F3D3E', 900: '#0A2A2B' },
        amber: { 500: '#E8A33D' },
      },
    },
  },
  plugins: [],
};
