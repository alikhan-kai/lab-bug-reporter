// Puts the Inter subsets the widget uses next to sdk.js, in dist/sdk-fonts/. The service serves them from there.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sdkRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(sdkRoot, 'node_modules', '@fontsource-variable', 'inter', 'files');
const target = join(sdkRoot, 'dist', 'sdk-fonts');
// Latin and Cyrillic, with the extended Cyrillic letters Kazakh needs.
const subsets = ['latin', 'cyrillic', 'cyrillic-ext'];

mkdirSync(target, { recursive: true });
for (const subset of subsets) {
  const fileName = `inter-${subset}-wght-normal.woff2`;
  copyFileSync(join(source, fileName), join(target, fileName));
}
console.log(`Copied ${subsets.length} Inter subsets to dist/sdk-fonts`);
