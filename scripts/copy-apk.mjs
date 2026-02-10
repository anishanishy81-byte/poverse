import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const candidates = [
  path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
  path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
];

const existing = candidates.filter((p) => fs.existsSync(p));
if (existing.length === 0) {
  console.error('No APK found. Build it first (android/app/build/outputs/apk/*).');
  process.exit(1);
}

const pick = existing.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];

const destDir = path.join(root, 'public', 'downloads');
fs.mkdirSync(destDir, { recursive: true });

const dest = path.join(destDir, 'po-verse.apk');
fs.copyFileSync(pick, dest);

console.log('Copied ' + pick + ' -> ' + dest);
