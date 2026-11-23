// Puts the Geist subsets the widget uses next to sdk.js, in dist/sdk-fonts/. The service serves them from there.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sdkRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(sdkRoot, 'dist', 'sdk-fonts');
// Latin and Cyrillic, with the extended Cyrillic letters Kazakh needs; the mono face only shows numbers.
const fonts = [
  { packageName: 'geist', subsets: ['latin', 'cyrillic', 'cyrillic-ext'] },
  { packageName: 'geist-mono', subsets: ['latin'] },
];

mkdirSync(target, { recursive: true });
let copied = 0;
for (const { packageName, subsets } of fonts) {
  const source = join(sdkRoot, 'node_modules', '@fontsource-variable', packageName, 'files');
  for (const subset of subsets) {
    const fileName = `${packageName}-${subset}-wght-normal.woff2`;
    copyFileSync(join(source, fileName), join(target, fileName));
    copied += 1;
  }
}
console.log(`Copied ${copied} Geist subsets to dist/sdk-fonts`);
