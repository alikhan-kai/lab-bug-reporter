import { Camera, CircleAlert, Image, Video, X, type IconNode } from 'lucide';

/** lucide icons as SVG markup for the widget's templates, drawn with the thin stroke of the widget. */
function toSvg(icon: IconNode, size: number): string {
  const children = icon
    .map(([tag, attributes]) => `<${tag} ${Object.entries(attributes).map(([name, value]) => `${name}="${value}"`).join(' ')}></${tag}>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${children}</svg>`;
}

function rawSvg(size: number, viewBox: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}" aria-hidden="true">${body}</svg>`;
}

export const icons = {
  /** The ring of the launcher, the same mark as the dashboard's. */
  mark: (size = 18) => rawSvg(size, '0 0 24 24',
    '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.75"></circle>' +
    '<circle cx="12" cy="12" r="2.75" fill="currentColor"></circle>'),
  record: (size = 18) => rawSvg(size, '0 0 24 24',
    '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.75"></circle>' +
    '<circle cx="12" cy="12" r="3.25" fill="currentColor"></circle>'),
  /** The filled ring with a tick of the "resolved" status. */
  sent: (size = 28) => rawSvg(size, '0 0 16 16',
    '<circle cx="8" cy="8" r="6.25" fill="currentColor"></circle>' +
    '<path d="M5.3 8.2l1.8 1.8 3.6-3.8" fill="none" stroke="var(--lab-bg)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>'),
  close: (size = 18) => toSvg(X, size),
  alert: (size = 16) => toSvg(CircleAlert, size),
  camera: (size = 18) => toSvg(Camera, size),
  video: (size = 14) => toSvg(Video, size),
  image: (size = 14) => toSvg(Image, size),
};
