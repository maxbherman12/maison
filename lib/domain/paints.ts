import type { CSSProperties } from 'react';

/** The wall colors a client can own. `ink` is the text color that sits on it. */
export const PAINTS = {
  verdigris: { label: 'Verdigris', color: '#1F5E54', ink: '#F2F7F1' },
  aubergine: { label: 'Aubergine', color: '#4F2556', ink: '#F8EFF6' },
  ochre: { label: 'Ochre', color: '#D2952A', ink: '#241A06' },
  delft: { label: 'Delft', color: '#27438F', ink: '#EFF2FB' },
  oxblood: { label: 'Oxblood', color: '#7A2430', ink: '#FBEFEF' },
  moss: { label: 'Moss', color: '#5A6B2F', ink: '#F6F8EC' },
  blush: { label: 'Blush', color: '#E3B4AE', ink: '#3A1B18' },
  ink: { label: 'Ink', color: '#20262E', ink: '#EEF1F5' },
} as const;

export type Paint = keyof typeof PAINTS;

export const PAINT_NAMES = Object.keys(PAINTS) as [Paint, ...Paint[]];

/** Makes everything inside, including primary buttons, wear this paint. */
export function paintStyle(paint: Paint): CSSProperties {
  return {
    '--primary': PAINTS[paint].color,
    '--primary-foreground': PAINTS[paint].ink,
  } as CSSProperties;
}

/** The first paint no client has yet, so new clients start out distinct. */
export function nextPaint(used: readonly Paint[]): Paint {
  return PAINT_NAMES.find((name) => !used.includes(name)) ?? PAINT_NAMES[0];
}
