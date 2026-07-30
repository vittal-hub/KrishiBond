/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F7F5EF',
          dim: '#EFEBE0',
          card: '#FFFEFB',
        },
        ink: {
          DEFAULT: '#1C2B22',
          soft: '#3E4A40',
          faint: '#7C8577',
        },
        canopy: {
          50: '#EAF0EA',
          100: '#CFDDCF',
          300: '#7FA07F',
          500: '#3E6B41',
          600: '#2F5233',
          700: '#25401E',
          900: '#152A17',
        },
        harvest: {
          50: '#FBF1DF',
          200: '#EED2A0',
          400: '#DDAA55',
          500: '#C98A2C',
          600: '#A96E1D',
          700: '#835216',
        },
        irrigation: {
          50: '#E7F0F2',
          300: '#8DB6BF',
          500: '#3A6B7A',
          600: '#2C5561',
          700: '#20404A',
        },
        clay: {
          50: '#F8E9E1',
          400: '#D07E52',
          500: '#B4502A',
          600: '#8E3E20',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Public Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        stub: '0 1px 0 rgba(28,43,34,0.06), 0 8px 24px -12px rgba(28,43,34,0.18)',
        stamp: '0 0 0 2px rgba(28,43,34,0.08)',
      },
      backgroundImage: {
        perforation:
          'radial-gradient(circle, rgba(28,43,34,0.16) 1.5px, transparent 1.5px)',
      },
      backgroundSize: {
        perf: '10px 10px',
      },
      borderRadius: {
        stub: '4px',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'hero-zoom': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.08)' },
        },
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        'fade-in': 'fade-in 0.6s ease-out',
        'hero-zoom': 'hero-zoom 18s ease-out infinite alternate',
      },
    },
  },
  plugins: [],
};
