import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appId = process.env.STEAM_APP_ID;
const depotId = process.env.STEAM_DEPOT_ID;
const setLive = process.env.STEAM_SET_LIVE || '';
const desc = process.env.STEAM_BUILD_DESC || 'Nova Swarm Windows release candidate';
const outputPath = path.resolve(process.env.STEAM_VDF_OUTPUT || 'release/steamworks/app_build_LOCAL.vdf');
const templatePath = path.resolve('release/steamworks/app_build_TEMPLATE.vdf');

if (!appId || !/^\d+$/.test(appId)) {
  throw new Error('STEAM_APP_ID must be set to the numeric Steamworks app ID.');
}

if (!depotId || !/^\d+$/.test(depotId)) {
  throw new Error('STEAM_DEPOT_ID must be set to the numeric Windows depot ID.');
}

const template = readFileSync(templatePath, 'utf8');
const rendered = template
  .replace('STEAM_APP_ID_HERE', appId)
  .replace('STEAM_DEPOT_ID_HERE', depotId)
  .replace('"Desc" "Nova Swarm Windows release candidate"', `"Desc" "${escapeVdf(desc)}"`)
  .replace('"SetLive" ""', `"SetLive" "${escapeVdf(setLive)}"`);

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, rendered, 'utf8');
console.log(`wrote ${path.relative(root, outputPath).replaceAll(path.sep, '/')}`);

function escapeVdf(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}
