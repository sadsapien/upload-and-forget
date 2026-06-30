import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0B',
        surface: '#131316',
        surface2: '#1B1B1F',
        border: '#232328',
        text: '#EDEDEF',
        muted: '#8A8A92',
        accent: '#E0334D',
        accentDim: '#7A1B28',
        ok: '#3DBE7A',
        warn: '#E0A23D',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '10px',
      },
    },
  },
  plugins: [],
};

export default config;
