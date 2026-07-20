import type { Config } from 'tailwindcss';

// Art direction tokens for Green Square.
// Restrained, professional agri-food B2B palette. No decorative gradients,
// no glassmorphism, small border radii, subtle shadows only.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#07642c', // authentic Green Square green (from official logo)
          dark: '#054d21',
          light: '#e6f0e9',
        },
        ink: {
          DEFAULT: '#1a1f1c', // near-black text
          soft: '#4a544d',
          faint: '#8a938c',
        },
        line: '#e3e6e4', // borders
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f6f8f6',
        },
        accent: '#c9a227', // wheat/gold, used sparingly
        danger: '#b3261e',
      },
      borderRadius: {
        card: '6px',
        control: '4px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,20,0.06), 0 1px 3px rgba(16,24,20,0.04)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
