import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageRoot = path.resolve(root, 'release', 'desktop', 'win-unpacked');
const targetRoot = path.resolve(packageRoot, 'resources', 'app.asar.unpacked', 'steam_sdk');
const sourceRoot = path.resolve(root, 'steam_sdk');

if (!targetRoot.startsWith(`${packageRoot}${path.sep}`)) {
  throw new Error(`Refusing to narrow SDK outside package root: ${targetRoot}`);
}

const files = [
  path.join('sdk', 'redistributable_bin', 'steam_api.dll'),
  path.join('sdk', 'redistributable_bin', 'win64', 'steam_api64.dll')
];
for (const relativePath of files) {
  if (!existsSync(path.join(sourceRoot, relativePath))) {
    throw new Error(`Missing SDK redistributable: ${relativePath}`);
  }
}

rmSync(targetRoot, { recursive: true, force: true });
for (const relativePath of files) {
  const destination = path.join(targetRoot, relativePath);
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(path.join(sourceRoot, relativePath), destination);
}

console.log(`[narrow-packaged-steam-sdk] PASS files=${files.length} target=${path.relative(root, targetRoot).replaceAll(path.sep, '/')}`);
