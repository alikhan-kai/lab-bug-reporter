import { Camera, Check, CircleAlert, CircleHelp, Image, Square, Video, X, type IconNode } from 'lucide';

/** lucide icons, the set campus.codes uses, as SVG markup for the widget's templates. */
function toSvg(icon: IconNode, size: number): string {
  const children = icon
    .map(([tag, attributes]) => `<${tag} ${Object.entries(attributes).map(([name, value]) => `${name}="${value}"`).join(' ')}></${tag}>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${children}</svg>`;
}

export const icons = {
  help: (size = 16) => toSvg(CircleHelp, size),
  close: (size = 18) => toSvg(X, size),
  alert: (size = 16) => toSvg(CircleAlert, size),
  camera: (size = 16) => toSvg(Camera, size),
  video: (size = 16) => toSvg(Video, size),
  image: (size = 14) => toSvg(Image, size),
  stop: (size = 12) => toSvg(Square, size),
  check: (size = 26) => toSvg(Check, size),
};
