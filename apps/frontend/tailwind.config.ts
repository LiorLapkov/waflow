import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // WhatsApp-style palette.
        wa: {
          green: '#25D366',
          teal: '#075E54',
          dark: '#111b21',
          panel: '#202c33',
          bubbleIn: '#202c33',
          bubbleOut: '#005c4b',
          sidebar: '#111b21',
          hover: '#2a3942',
        },
      },
    },
  },
  plugins: [],
};

export default config;
