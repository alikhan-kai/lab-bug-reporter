import { resolveNextToScript } from '../core/script-url';

// Family names of their own, so the font faces never change how the host site's text looks.
export const WIDGET_FONT_FAMILY = 'Lab Reporter Geist';
export const WIDGET_MONO_FONT_FAMILY = 'Lab Reporter Geist Mono';

const LATIN_RANGE = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

const FACES: { family: string; file: string; unicodeRange: string }[] = [
  { family: WIDGET_FONT_FAMILY, file: 'geist-latin-wght-normal.woff2', unicodeRange: LATIN_RANGE },
  { family: WIDGET_FONT_FAMILY, file: 'geist-cyrillic-wght-normal.woff2', unicodeRange: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116' },
  // Kazakh letters such as ә, ғ, қ, ң, ө, ұ, ү, һ.
  { family: WIDGET_FONT_FAMILY, file: 'geist-cyrillic-ext-wght-normal.woff2', unicodeRange: 'U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F' },
  // The mono face shows only times, sizes and the report number, so Latin is enough.
  { family: WIDGET_MONO_FONT_FAMILY, file: 'geist-mono-latin-wght-normal.woff2', unicodeRange: LATIN_RANGE },
];

/**
 * Declares Geist for the widget from the files next to sdk.js. Font faces declared inside a shadow root are
 * ignored, so the declaration goes into the page's head. Without the files the widget keeps the system font.
 */
export function loadWidgetFont(): void {
  if (typeof document === 'undefined' || document.getElementById('lab-reporter-font')) return;
  const faces = FACES.map((face) => {
    const url = resolveNextToScript(`sdk-fonts/${face.file}`);
    return url
      ? `@font-face{font-family:'${face.family}';font-style:normal;font-weight:100 900;font-display:swap;` +
        `src:url('${url}') format('woff2-variations');unicode-range:${face.unicodeRange};}`
      : '';
  }).join('');
  if (!faces) return;

  const style = document.createElement('style');
  style.id = 'lab-reporter-font';
  style.textContent = faces;
  document.head.appendChild(style);
}
