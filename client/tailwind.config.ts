import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#2d5a3d',
          dark: '#1e3d2a',
          light: '#3d7a55',
          accent: '#4a9468',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e0c47a',
          dark: '#a07830',
        },
        cream: '#f5f0e8',
        card: '#fefef9',
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)',
        'card-hover': '0 6px 20px rgba(0,0,0,0.35)',
        'felt': 'inset 0 0 60px rgba(0,0,0,0.3)',
        'gold': '0 0 0 2px #c9a84c',
      },
      backgroundImage: {
        'felt-texture': `
          radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.03) 0%, transparent 50%),
          radial-gradient(ellipse at 70% 80%, rgba(0,0,0,0.1) 0%, transparent 50%)
        `,
      },
      animation: {
        'deal-in': 'dealIn 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        dealIn: {
          '0%': { transform: 'translateY(-40px) rotate(-5deg)', opacity: '0' },
          '100%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 2px #c9a84c' },
          '50%': { boxShadow: '0 0 0 4px #c9a84c, 0 0 12px rgba(201,168,76,0.4)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
