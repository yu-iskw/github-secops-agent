import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..');
const src = join(pkgRoot, 'src/config/secops-config.schema.json');
const destDir = join(pkgRoot, 'dist/config');
mkdirSync(destDir, { recursive: true });
copyFileSync(src, join(destDir, 'secops-config.schema.json'));
