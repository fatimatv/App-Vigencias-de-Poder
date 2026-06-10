import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ialaw: {
          blue: '#011EF4',
          yellow: '#FBBB02',
          gray: '#6F7072',
          ink: '#071026',
          mist: '#F3F6FF'
        },
        navy: {
          50: '#f3f6ff',
          100: '#dfe6ff',
          200: '#b9c6ff',
          300: '#8395ff',
          500: '#011ef4',
          700: '#0114aa',
          900: '#000b65',
          950: '#00063a'
        },
        sunarp: {
          yellow: '#FBBB02',
          red: '#c73b3b',
          green: '#2f855a'
        }
      },
      fontFamily: {
        sans: ['"Cocogoose Light"', '"Century Gothic"', 'Aptos', 'Segoe UI', 'Arial', 'sans-serif'],
        title: ['"Cocogoose Demibold"', '"Arial Black"', '"Century Gothic"', 'Arial', 'sans-serif'],
        subtitle: ['"Bebas Neue"', '"Arial Narrow"', 'Impact', 'sans-serif']
      }
    }
  },
  plugins: []
} satisfies Config;
