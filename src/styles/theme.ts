// Central design tokens. This is the single source of truth consumed by both
// Tailwind (via tailwind.config.ts) and runtime code (R3F colors, textures).

export const palette = {
  void: '#04030c',
  midnight: '#080a1f',
  'midnight-700': '#0d1230',
  navy: '#11203f',
  'navy-light': '#1a2c52',
  violet: '#2b1a4d',
  'violet-light': '#4a2f7a',
  purple: '#3c2363',
  'purple-light': '#5d3a8f',
  magenta: '#9a3a6b',
  'magenta-soft': '#b85a85',
  coral: '#d96a5a',
  orange: '#e8905a',
  lavender: '#c9b6e8',
  'soft-white': '#f3f0ff',
  cyan: '#5ad9e6',
  neon: '#ffb02e',
  'cyan-deep': '#2a9fb0',
} as const

export const fontFamilyStack = {
  display: ['"Prosto One"', 'system-ui', 'sans-serif'],
  heading: ['"Sora"', 'system-ui', 'sans-serif'],
  body: ['"Figtree"', 'system-ui', 'sans-serif'],
} as const

export type PaletteKey = keyof typeof palette

export function color(key: PaletteKey): string {
  return palette[key]
}
