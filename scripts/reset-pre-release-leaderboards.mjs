import { spawnSync } from 'node:child_process';
import path from 'node:path';

const CONFIRMATION = 'I_UNDERSTAND_PRE_RELEASE_RESET';
const databaseName = process.env.NOVA_SWARM_D1_DATABASE || 'burt-game-db';
const confirmation = process.env.NOVA_SWARM_RESET_LEADERBOARD || '';

const seeds = [
  ['NOVAROOK', 500, 2],
  ['VOIDCADET', 900, 3],
  ['PIXELPILOT', 1200, 4],
  ['ORBITKID', 1800, 5],
  ['COMETACE', 2400, 6],
  ['NEONRIDER', 3100, 7],
  ['STARRUNNER', 3900, 8],
  ['QUANTUMQ', 4800, 9],
  ['SIGNALACE', 6200, 10],
  ['ARCADEZERO', 7900, 11]
];

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

if (confirmation !== CONFIRMATION) {
  console.error(`[leaderboard-reset] Refusing to reset remote D1 without NOVA_SWARM_RESET_LEADERBOARD=${CONFIRMATION}`);
  console.error('[leaderboard-reset] This is intended only for pre-release leaderboard cleanup.');
  process.exit(1);
}

const values = seeds.map(([name, score, level], index) => {
  const createdAt = new Date(Date.UTC(2026, 0, index + 1)).toISOString();
  return `(${sqlString(name)}, ${score}, ${level}, ${sqlString(createdAt)})`;
}).join(', ');

const sql = `DELETE FROM game_highscores; INSERT INTO game_highscores (name, score, level, created_at) VALUES ${values};`;

const wranglerCli = path.resolve('node_modules/wrangler/bin/wrangler.js');
const result = spawnSync(process.execPath, [
  wranglerCli,
  'd1',
  'execute',
  databaseName,
  '--remote',
  '--command',
  sql
], {
  stdio: 'inherit'
});

if (result.error) {
  console.error('[leaderboard-reset] Failed to launch wrangler:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
