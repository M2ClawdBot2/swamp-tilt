/**
 * Design tokens: cabinet backglass printing, not web defaults. Deep swamp
 * black, hot orange, institutional blue-grey (L2), brass (L3). Pinned once
 * here — everything else (CSS, Three.js materials) reads from this file.
 */
export const COLORS = {
  swampBlack: '#0a0f0c',
  swampBlackDeep: '#050705',
  hotOrange: '#e8863a',
  hotOrangeBright: '#ff9d4d',
  institutionalBlueGrey: '#5c6b78',
  institutionalBlueGreyDark: '#33404a',
  brass: '#b8964f',
  brassBright: '#d4b06a',
  dmdAmber: '#ff9d1a',
  dmdOff: '#3a2a10',
  paperWhite: '#e9e4d8',
  alertRed: '#d93a2b',
} as const

export const FONTS = {
  // condensed display face for backglass/menus — a real webfont ships in a
  // later pass; system fallbacks keep this honest until then
  display: `'Oswald', 'Arial Narrow', sans-serif`,
  // DMD score readout reads like a dot-matrix display — a mono face stands in
  dmd: `'Courier New', ui-monospace, monospace`,
  body: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
} as const

export const LEVEL_ACCENT: Record<1 | 2 | 3, string> = {
  1: COLORS.hotOrange,
  2: COLORS.institutionalBlueGrey,
  3: COLORS.brass,
}

export function cssVariables(): string {
  return Object.entries(COLORS)
    .map(([k, v]) => `--st-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`)
    .join('\n  ')
}
