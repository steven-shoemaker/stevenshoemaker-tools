export type Swatch = { name: string; hex: string }

/** The full picker palette. */
export const PALETTE: Swatch[] = [
  { name: 'Blush', hex: '#f5cccc' },
  { name: 'Peach', hex: '#f5cebd' },
  { name: 'Butter', hex: '#f5df8d' },
  { name: 'Chartreuse', hex: '#c3e5a2' },
  { name: 'Sage', hex: '#a5ebbc' },
  { name: 'Mint', hex: '#8cecdc' },
  { name: 'Aqua', hex: '#9de5f4' },
  { name: 'Sky', hex: '#b5d5f4' },
  { name: 'Periwinkle', hex: '#d0d5f4' },
  { name: 'Lilac', hex: '#e2cef4' },
  { name: 'Rose', hex: '#f5c9e0' },
]

/** Defaults, ordered so neighbouring criteria stay distinguishable. */
const DEFAULTS = [
  '#c3e5a2',
  '#b5d5f4',
  '#e2cef4',
  '#8cecdc',
  '#f5c9e0',
  '#9de5f4',
]

/**
 * Imported files are untrusted, so a colour is only honoured when it is one we
 * actually ship; anything else falls back to the positional default.
 */
export function isPaletteColor(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    PALETTE.some((s) => s.hex === value.toLowerCase())
  )
}

export function criterionColor(index: number, color?: string): string {
  if (isPaletteColor(color)) return color.toLowerCase()
  return DEFAULTS[index % DEFAULTS.length]
}

export function swatchName(hex: string): string {
  return PALETTE.find((s) => s.hex === hex.toLowerCase())?.name ?? 'Custom'
}
