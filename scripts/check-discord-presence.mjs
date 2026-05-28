import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const { buildDiscordActivity, isValidDiscordClientId } = require('../electron/discordPresence.cjs');

function assert(condition, message, details = undefined) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

const fixedStart = Date.UTC(2026, 0, 1);
assert(!isValidDiscordClientId(''), 'empty Discord client ID must be treated as unconfigured');
assert(!isValidDiscordClientId('123'), 'short Discord client ID must be rejected');
assert(isValidDiscordClientId('123456789012345678'), 'Discord snowflake-like client ID must be accepted');

const menu = buildDiscordActivity({ scene: 'menu' }, { startTimestamp: fixedStart });
assert(menu.details === 'Arcade patrol', 'menu activity details changed unexpectedly', menu);
assert(menu.state === 'In the menu', 'menu activity state changed unexpectedly', menu);
assert(menu.startTimestamp === fixedStart, 'activity must preserve start timestamp', menu);

const play = buildDiscordActivity({ scene: 'play', level: 7 }, { startTimestamp: fixedStart });
assert(play.state === 'Sector 7', 'play activity must include current sector', play);

const gameOver = buildDiscordActivity({ scene: 'gameOver' }, { startTimestamp: fixedStart });
assert(gameOver.state === 'Game over', 'game-over activity state changed unexpectedly', gameOver);

const hangar = buildDiscordActivity({ scene: 'shipSelect' }, { startTimestamp: fixedStart, largeImageKey: 'nova_swarm' });
assert(hangar.state === 'In the hangar', 'hangar activity state changed unexpectedly', hangar);
assert(hangar.largeImageKey === 'nova_swarm', 'large image key must be included when configured', hangar);
assert(hangar.largeImageText === 'Nova Swarm', 'large image text must identify the game', hangar);

const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
assert(packageJson.dependencies?.['discord-rpc'], 'package.json must include discord-rpc dependency');
assert(packageJson.scripts?.['check:discord-presence'], 'package.json must expose check:discord-presence');

const electronBuilder = JSON.parse(fs.readFileSync(path.join(rootDir, 'electron-builder.json'), 'utf8'));
const files = electronBuilder.files || [];
for (const required of [
  'node_modules/discord-rpc/**/*',
  'node_modules/node-fetch/**/*',
  'node_modules/whatwg-url/**/*',
  'node_modules/tr46/**/*',
  'node_modules/webidl-conversions/**/*'
]) {
  assert(files.includes(required), `electron-builder files must package ${required}`, { files });
}

console.log(JSON.stringify({
  status: 'passed',
  checks: {
    clientIdValidation: true,
    activityMapping: true,
    packagedDependencies: true
  }
}, null, 2));
