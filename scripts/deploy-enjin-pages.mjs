import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const enjinConfig = path.join(root, 'wrangler.enjin.toml');
const wrangler = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'nova-swarm-enjin-pages-'));

try {
  await Promise.all([fs.access(dist), fs.access(enjinConfig), fs.access(wrangler)]);
  // Pages only accepts a config named wrangler.toml. Stage the Enjin-only
  // configuration so the standard deployment config remains untouched.
  await fs.copyFile(enjinConfig, path.join(staging, 'wrangler.toml'));

  const args = [
    wrangler,
    'pages',
    'deploy',
    dist,
    '--project-name=burt-game',
    '--branch=enjin-webedition',
    ...process.argv.slice(2)
  ];
  const child = spawn(process.execPath, args, {
    cwd: staging,
    env: process.env,
    stdio: 'inherit'
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) throw new Error(`Enjin Pages deployment failed with exit code ${exitCode}.`);
} finally {
  await fs.rm(staging, { recursive: true, force: true });
}
