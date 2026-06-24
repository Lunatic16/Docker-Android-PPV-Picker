// ─────────────────────────────────────────────────────────────────────────────
// src/components/theme.ts
// Colour palette and spacing constants for the PPV Picker UI.
// Matches the ANSI sky/amber/slate palette from the Python terminal client.
// ─────────────────────────────────────────────────────────────────────────────

export const Colors = {
  // Backgrounds
  bg:           '#0d1117',   // near-black (primary bg)
  bgCard:       '#161b22',   // card / list-item bg
  bgSelected:   '#1f2937',   // focused / selected row (≈ bg_sel)
  bgHeader:     '#111827',   // sticky list header

  // Accents — sky/amber/slate theme
  sky:          '#7db4d8',   // cornflower blue   (#38;5;110)
  amber:        '#d4a017',   // warm gold          (#38;5;179)
  sage:         '#6a9f7a',   // muted green        (#38;5;108)
  warn:         '#cd7655',   // orange-red         (#38;5;173)
  rose:         '#f47d7d',   // bright rose        (#38;5;204)

  // Text tiers
  textPrimary:  '#e6edf3',   // bold event name
  textSecondary:'#8b949e',   // slate / dim         (#38;5;246)
  textMuted:    '#484f58',   // very dim

  // Borders
  border:       '#21262d',

  // Live-state badge colours
  live:         '#cd7655',   // warn
  soon:         '#d4a017',   // amber
  ended:        '#484f58',   // muted
  info:         '#8b949e',   // slate

  // Misc
  white:        '#ffffff',
  black:        '#000000',
  transparent:  'transparent',
};

export const FontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
};

export const Radius = {
  sm:  4,
  md:  8,
  lg:  12,
  full: 999,
};
