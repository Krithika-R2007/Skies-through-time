import type { Config } from 'tailwindcss'
import { palette, fontFamilyStack } from './src/styles/theme'

// Single source of truth for palette + fonts lives in src/styles/theme.ts so
// runtime code (R3F colors, procedural textures) and Tailwind stay in sync.
const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: palette,
      fontFamily: fontFamilyStack,
      boxShadow: {
        glow: '0 0 40px rgba(154,58,107,0.35)',
        'glow-cyan': '0 0 32px rgba(90,217,230,0.35)',
      },
      transitionTimingFunction: {
        space: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

export default config
