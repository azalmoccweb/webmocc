export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 24px 80px rgba(15, 23, 42, 0.28)',
        soft: '0 20px 50px rgba(15, 23, 42, 0.18)'
      },
      backgroundImage: {
        'hero-radial': 'radial-gradient(circle at top left, rgba(239,68,68,0.18), transparent 32%), radial-gradient(circle at top right, rgba(59,130,246,0.16), transparent 28%), linear-gradient(180deg, #08111f 0%, #0f172a 34%, #eef3fb 34%, #eef3fb 100%)'
      }
    }
  },
  plugins: []
};
