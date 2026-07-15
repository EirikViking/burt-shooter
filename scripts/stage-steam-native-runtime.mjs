import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const sourceNodeModules = path.resolve(
  process.env.NOVA_SWARM_STEAM_RUNTIME_SOURCE || path.join(root, 'node_modules')
);
const packageRoot = path.resolve(
  process.env.NOVA_SWARM_STEAM_PACKAGE_ROOT || path.join(root, 'release', 'desktop', 'win-unpacked')
);
const packagedNodeModules = path.join(
  packageRoot,
  'resources',
  'app.asar.unpacked',
  'node_modules'
);

const packages = [
  {
    name: 'steamworks-ffi-node',
    required: [
      'package.json',
      path.join('dist', 'index.js'),
      path.join('prebuilds', 'win32-x64', 'steam-overlay.node')
    ]
  },
  {
    name: 'koffi',
    required: [
      'package.json',
      'index.js',
      path.join('build', 'koffi', 'win32_x64', 'koffi.node')
    ]
  }
];

function assertFiles(base, required, label) {
  const missing = required.filter((relativePath) => !existsSync(path.join(base, relativePath)));
  if (missing.length) {
    throw new Error(`${label} missing ${missing.join(', ')}`);
  }
}

function copyRuntimePackage(source, destination) {
  rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });
  if (process.platform === 'win32') {
    const result = spawnSync('robocopy.exe', [
      source,
      destination,
      '/E',
      '/XJ',
      '/SL',
      '/COPY:DAT',
      '/DCOPY:DAT',
      '/R:1',
      '/W:1',
      '/MT:8',
      '/NFL',
      '/NDL',
      '/NP'
    ], {
      stdio: 'inherit',
      windowsHide: true
    });
    if (result.error) throw result.error;
    if (result.status == null || result.status >= 8) {
      throw new Error(`robocopy failed for ${path.basename(source)} with status ${result.status}`);
    }
    return;
  }
  cpSync(source, destination, {
    recursive: true,
    dereference: true,
    force: true,
    errorOnExist: false
  });
}

if (!existsSync(packageRoot)) {
  throw new Error(`Steam package root does not exist: ${packageRoot}`);
}

mkdirSync(packagedNodeModules, { recursive: true });

for (const packageSpec of packages) {
  const source = path.join(sourceNodeModules, packageSpec.name);
  const destination = path.join(packagedNodeModules, packageSpec.name);
  assertFiles(source, packageSpec.required, `source ${packageSpec.name}`);
  copyRuntimePackage(source, destination);
  assertFiles(destination, packageSpec.required, `packaged ${packageSpec.name}`);
}

console.log(`[stage-steam-native-runtime] PASS package=${path.relative(root, packageRoot).replaceAll(path.sep, '/')} modules=${packages.map(({ name }) => name).join(',')}`);
