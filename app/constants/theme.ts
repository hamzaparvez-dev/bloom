// ─────────────────────────────────────────────────────────────────────────────
// Bloom — Design System Theme
// Source of truth: Figma node 1:10  (file LizjFM6F4ZNQMA0OlxsaCw)
// Extracted: 2026-04-09
//
// Usage:
//   import { Theme } from '../../constants/theme';
//   Theme.colors.primary   → '#E8618C'
//   Theme.typography.h1    → { fontSize: 34, fontWeight: '800', lineHeight: 41 }
//   Theme.spacing.pagePad  → 20
//   Theme.radius.card      → 16
// ─────────────────────────────────────────────────────────────────────────────

import { TextStyle } from 'react-native';

// ── 1. Colors ─────────────────────────────────────────────────────────────────

export const ThemeColors = {
  // ─ Brand / accent ──────────────────────────────────────────────────────────
  /** Primary pink — CTA buttons, selected states, active indicators */
  primary:     '#E8618C',
  /** Pressed / hover variant of primary */
  primaryDark: '#C44A73',
  /** Lavender — secondary accent, mood states, tags */
  lavender:    '#9C8FC4',
  /** Peach — fertility / ovulation highlights, warm accents */
  peach:       '#FAA87D',
  /** Mint — positive / healthy indicators */
  mint:        '#6ECF9E',
  /** Sky — informational, cycle-day indicators */
  sky:         '#73C2E8',

  // ─ Backgrounds ─────────────────────────────────────────────────────────────
  /** App-level screen background — very light blush */
  bgCream:     '#FFF5F7',
  /** Card / modal / sheet surfaces */
  surface:     '#FFFFFF',

  // ─ Text ────────────────────────────────────────────────────────────────────
  /** Headings and primary body text */
  textDark:    '#1A0F2E',
  /** Subtitles, row labels, secondary body */
  textMid:     '#5C5470',
  /** Placeholders, disabled, hint text */
  textLight:   '#A199B8',

  // ─ Structure ───────────────────────────────────────────────────────────────
  /** Dividers, input borders, card outlines */
  border:      '#EDE8F5',

  // ─ Internal tokens — not defined in Figma DS, used in existing screens ─────
  // These are preserved as-is; migrate to Figma tokens when screens are rebuilt.
  pinkSurface: '#FCEDF4',   // used ×9 — soft pink tinted surfaces
  pinkLight:   '#FCEDEA',   // used ×3 — very light pink backgrounds
  bgDeep:      '#F7E2ED',   // used ×2 — deeper blush for gradient areas
  purpleBg:    '#EFEAFF',   // used ×1
  purpleLight: '#DDD1FC',   // used ×2 — decorative circles
  greenBg:     '#EAFFE2',   // used ×1
  orangeBg:    '#FCEACC',   // used ×1

  // ─ Always-available aliases ─────────────────────────────────────────────────
  white:       '#FFFFFF',
  transparent: 'transparent',
} as const;

export type ThemeColorKey = keyof typeof ThemeColors;

// ── 2. Typography ─────────────────────────────────────────────────────────────
// Font family: Inter  (falls back to system sans-serif on devices without Inter)
// Line heights use a 1.2–1.5 multiplier depending on size — matches Figma spacing.

export const ThemeTypography: Record<string, TextStyle> = {
  /** 34 / 800 — screen large titles */
  h1: {
    fontSize:   34,
    fontWeight: '800',
    lineHeight: 41,
  },
  /** 28 / 700 — section titles, onboarding headlines */
  h2: {
    fontSize:   28,
    fontWeight: '700',
    lineHeight: 34,
  },
  /** 22 / 600 — card headings, modal titles */
  h3: {
    fontSize:   22,
    fontWeight: '600',
    lineHeight: 28,
  },
  /** 16 / 400 — default body copy */
  body: {
    fontSize:   16,
    fontWeight: '400',
    lineHeight: 24,
  },
  /** 16 / 600 — emphasized body, row values */
  bodyStrong: {
    fontSize:   16,
    fontWeight: '600',
    lineHeight: 24,
  },
  /** 13 / 400 — secondary info, helper text */
  caption: {
    fontSize:   13,
    fontWeight: '400',
    lineHeight: 18,
  },
  /** 12 / 500 — form labels, tags, chips */
  label: {
    fontSize:   12,
    fontWeight: '500',
    lineHeight: 16,
  },
  // ─ Extra tokens used by existing components (not in Figma DS) ───────────────
  /** 17 / 600 — primary button text, navigation titles */
  button: {
    fontSize:   17,
    fontWeight: '600',
    lineHeight: 22,
  },
  /** 15 / 400 — subtitles, onboarding sub-text */
  callout: {
    fontSize:   15,
    fontWeight: '400',
    lineHeight: 20,
  },
} as const;

// ── 3. Spacing (8pt grid) ─────────────────────────────────────────────────────

export const ThemeSpacing = {
  // ─ Raw scale ────────────────────────────────────────────────────────────────
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  7:  28,
  8:  32,
  10: 40,
  12: 48,
  16: 64,

  // ─ Named semantic aliases ────────────────────────────────────────────────────
  /** Horizontal screen edge padding — confirmed 20 across all onboarding screens */
  pagePad:    20,
  /** Internal card padding */
  cardPad:    16,
  /** Gap between major page sections */
  sectionGap: 24,
  /** Gap between form fields / list items */
  itemGap:    12,
  /** Gap between inline elements (icon + text) */
  inlineGap:  8,
} as const;

// ── 4. Border Radius ──────────────────────────────────────────────────────────
// Values observed from Figma DS (swatches: 16px) and existing components.

export const ThemeRadius = {
  /** 2 — progress bars, thin bars */
  xs:   2,
  /** 8 — subtle rounding (e.g. toggle tracks) */
  sm:   8,
  /** 12 — small chips */
  md:   12,
  /** 16 — cards, inputs, chips — most common in codebase (×6 components) */
  card: 16,
  /** 24 — calendar card, large bottom sheets */
  lg:   24,
  /** 28 — primary CTA buttons */
  button: 28,
  /** 999 — pill / fully rounded (use for tags, toggles) */
  pill: 999,
} as const;

// ── 5. Shadows ────────────────────────────────────────────────────────────────
// Not yet used in the codebase — defined here for future cards / sheets.

export const ThemeShadows = {
  /** Subtle card lift */
  card: {
    shadowColor:   ThemeColors.textDark,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  8,
    elevation:     3,
  },
  /** Bottom sheet drop shadow */
  sheet: {
    shadowColor:   ThemeColors.textDark,
    shadowOffset:  { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius:  16,
    elevation:     8,
  },
} as const;

// ── 6. Convenience default export ─────────────────────────────────────────────

export const Theme = {
  colors:     ThemeColors,
  typography: ThemeTypography,
  spacing:    ThemeSpacing,
  radius:     ThemeRadius,
  shadows:    ThemeShadows,
} as const;
