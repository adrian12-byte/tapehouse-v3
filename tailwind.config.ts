import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15171A',
        panel: '#1F2226',
        panelLight: '#292D33',
        bone: '#EDEAE2',
        boneDim: '#A8A399',
        brass: '#C7952B',
        brassBright: '#E4B84A',
        signal: '#4FE0A0',
        rust: '#C0503A',
        hairline: '#33373D',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        none: '0px',
      },
      boxShadow: {
        console: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.35)',
      },
      keyframes: {
        spin_slow: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
