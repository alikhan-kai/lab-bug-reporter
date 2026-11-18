/** How the floating button looks: icon and text, a round icon, a tab on the screen edge, or none at all. */
export type LauncherStyle = 'pill' | 'icon' | 'tab' | 'none';
export type WidgetPosition = 'bottom-right' | 'bottom-left';
export type WidgetCorners = 'sharp' | 'soft' | 'round';

/**
 * What a site may change in the widget. Everything is optional; the defaults are a pill in the bottom right corner
 * with soft corners and the cobalt accent. With `launcher: 'none'` the site opens the form with its own button
 * through `LabReporter.open()`.
 */
export interface WidgetAppearance {
  launcher?: LauncherStyle;
  /** Text of the pill and tab buttons. By default the "help" word of the page language. */
  launcherText?: string;
  /** A hex colour, or one per theme when the site's brand colour is too dark or too light for one of them. */
  accentColor?: string | { light: string; dark: string };
  position?: WidgetPosition;
  corners?: WidgetCorners;
  /** Distance of the button from the screen edges, in pixels. */
  offset?: { x?: number; y?: number };
}

export interface AccentColors {
  color: string;
  /** Text on the accent: dark on a light accent, white on a dark one. */
  onColor: string;
}

export interface ResolvedAppearance {
  launcher: LauncherStyle;
  launcherText: string | null;
  position: WidgetPosition;
  corners: WidgetCorners;
  offsetX: number;
  offsetY: number;
  accentLight: AccentColors | null;
  accentDark: AccentColors | null;
}

const LAUNCHERS: LauncherStyle[] = ['pill', 'icon', 'tab', 'none'];
const POSITIONS: WidgetPosition[] = ['bottom-right', 'bottom-left'];
const CORNERS: WidgetCorners[] = ['sharp', 'soft', 'round'];
const DEFAULT_OFFSET = 24;
const MAX_OFFSET = 400;
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
// Above this luminance white text drops below 4.5:1, so the label turns dark.
const LIGHT_ACCENT_LUMINANCE = 0.18;
const DARK_TEXT = '#1c1b18';
const LIGHT_TEXT = '#ffffff';

const RADII: Record<WidgetCorners, { md: number; lg: number; xl: number; launcher: string }> = {
  sharp: { md: 4, lg: 6, xl: 8, launcher: '6px' },
  soft: { md: 8, lg: 10, xl: 16, launcher: '12px' },
  round: { md: 10, lg: 14, xl: 22, launcher: '999px' },
};

// A wrong value in a site's settings must not break the page, so it falls back to the default and says why.
function pick<T extends string>(value: unknown, allowed: T[], fallback: T, name: string): T {
  if (value === undefined) return fallback;
  if (allowed.includes(value as T)) return value as T;
  console.warn(`[LabReporter] appearance.${name} "${String(value)}" is not one of ${allowed.join(', ')}; using "${fallback}"`);
  return fallback;
}

function toOffset(value: unknown, name: string): number {
  if (value === undefined) return DEFAULT_OFFSET;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_OFFSET) return Math.round(value);
  console.warn(`[LabReporter] appearance.offset.${name} must be a number from 0 to ${MAX_OFFSET}; using ${DEFAULT_OFFSET}`);
  return DEFAULT_OFFSET;
}

function expandHex(color: string): string {
  const digits = color.slice(1);
  return digits.length === 3 ? digits.split('').map((digit) => digit + digit).join('') : digits;
}

/** The WCAG relative luminance of a hex colour, 0 for black to 1 for white. */
export function luminanceOf(color: string): number {
  const digits = expandHex(color);
  const [red, green, blue] = [0, 2, 4]
    .map((start) => parseInt(digits.slice(start, start + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function toAccent(color: unknown, name: string): AccentColors | null {
  if (color === undefined) return null;
  if (typeof color !== 'string' || !HEX_COLOR.test(color)) {
    console.warn(`[LabReporter] appearance.${name} must be a hex colour such as #4447c9; using the default accent`);
    return null;
  }
  const normalized = `#${expandHex(color).toLowerCase()}`;
  return { color: normalized, onColor: luminanceOf(normalized) > LIGHT_ACCENT_LUMINANCE ? DARK_TEXT : LIGHT_TEXT };
}

/** Checks a site's appearance settings and fills in the defaults. */
export function resolveAppearance(appearance: WidgetAppearance = {}): ResolvedAppearance {
  const accent = appearance.accentColor;
  const isPerTheme = typeof accent === 'object' && accent !== null;
  const launcherText = typeof appearance.launcherText === 'string' && appearance.launcherText.trim()
    ? appearance.launcherText.trim()
    : null;
  const accentLight = toAccent(isPerTheme ? accent.light : accent, isPerTheme ? 'accentColor.light' : 'accentColor');
  const accentDark = isPerTheme ? toAccent(accent.dark, 'accentColor.dark') : accentLight;

  return {
    launcher: pick(appearance.launcher, LAUNCHERS, 'pill', 'launcher'),
    launcherText,
    position: pick(appearance.position, POSITIONS, 'bottom-right', 'position'),
    corners: pick(appearance.corners, CORNERS, 'soft', 'corners'),
    offsetX: toOffset(appearance.offset?.x, 'x'),
    offsetY: toOffset(appearance.offset?.y, 'y'),
    accentLight,
    accentDark,
  };
}

function accentVariables(accent: AccentColors): string {
  return `--lab-primary:${accent.color};--lab-on-primary:${accent.onColor};` +
    `--lab-primary-hover:color-mix(in srgb, ${accent.color} 86%, ${accent.onColor});` +
    `--lab-primary-soft:color-mix(in srgb, ${accent.color} 16%, transparent);`;
}

/**
 * The CSS that applies the appearance inside the widget's shadow root. It comes after the base styles, so a site's
 * accent wins over the theme's default accent in both themes.
 */
export function appearanceStyles(appearance: ResolvedAppearance): string {
  const radii = RADII[appearance.corners];
  const rules = [
    `:host{--lab-radius-md:${radii.md}px;--lab-radius-lg:${radii.lg}px;--lab-radius-xl:${radii.xl}px;` +
      `--lab-radius-launcher:${radii.launcher};--lab-offset-x:${appearance.offsetX}px;--lab-offset-y:${appearance.offsetY}px;` +
      `${appearance.accentLight ? accentVariables(appearance.accentLight) : ''}}`,
  ];
  if (appearance.accentDark) {
    const dark = accentVariables(appearance.accentDark);
    rules.push(`:host([data-theme='dark']){${dark}}`);
    rules.push(`@media (prefers-color-scheme: dark){:host([data-theme='system']){${dark}}}`);
  }
  return rules.join('\n');
}
