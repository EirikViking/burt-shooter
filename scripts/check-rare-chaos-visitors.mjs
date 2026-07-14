import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import {
  RARE_CHAOS_VISITOR_VARIANT_COUNT,
  RARE_CHAOS_VISITOR_VARIANTS,
  RARE_CHAOS_VISITOR_WAVE_CHANCE,
  getRareChaosVisitorVariant,
  isRareChaosVisitorEligibleWave,
  planRareChaosVisitorSpawn
} from '../src/config/RareChaosVisitors.js';
import { rareChaosVisitorVoiceLines } from '../src/config/RareChaosVisitorVoiceLines.js';
import { getThreatCodexCatalog } from '../src/config/ThreatCodexCatalog.js';
import { AssetManifest } from '../src/assets/assetManifest.js';
import { SFX_CATALOG, SFX_MIX, VOICE_MIX } from '../src/audio/SoundCatalog.js';

const root = path.resolve('.');
const managerSource = readFileSync(path.join(root, 'src/managers/EnemyManager.js'), 'utf8');
const enemySource = readFileSync(path.join(root, 'src/entities/Enemy.js'), 'utf8');
const sceneSource = readFileSync(path.join(root, 'src/scenes/PlayScene.js'), 'utf8');
const generatorSource = readFileSync(path.join(root, 'scripts/generate-rare-chaos-visitor-audio.mjs'), 'utf8');

assert.equal(RARE_CHAOS_VISITOR_WAVE_CHANCE, 0.004, 'eligible standard waves must use the story-rare 0.4% roll');
assert.equal(RARE_CHAOS_VISITOR_VARIANT_COUNT, 99);
assert.equal(RARE_CHAOS_VISITOR_VARIANTS.length, 99);
assert.equal(new Set(RARE_CHAOS_VISITOR_VARIANTS.map((item) => item.id)).size, 99);
assert.deepEqual(RARE_CHAOS_VISITOR_VARIANTS.map((item) => item.number), Array.from({ length: 99 }, (_, index) => index + 1));
assert.equal(getRareChaosVisitorVariant(100).number, 1, 'numeric lookup should wrap for safe debug cycling');
assert.ok(RARE_CHAOS_VISITOR_VARIANTS.every((item) => item.enemyType && item.threatActionId && item.rewardPowerupType));

const standardWave = { type: 'generated_enemy', count: 8 };
assert.equal(isRareChaosVisitorEligibleWave(standardWave), true);
assert.equal(isRareChaosVisitorEligibleWave({ ...standardWave, isChallenge: true }), false);
assert.equal(isRareChaosVisitorEligibleWave({ ...standardWave, isMayhemReinforcement: true }), false);
assert.equal(isRareChaosVisitorEligibleWave({ type: 'BOSS' }), false);
const planA = planRareChaosVisitorSpawn({ seed: 'repeatable', level: 7, waveIndex: 2, config: standardWave });
const planB = planRareChaosVisitorSpawn({ seed: 'repeatable', level: 7, waveIndex: 2, config: standardWave });
assert.deepEqual(planA, planB, 'rare encounters must be reproducible from run seed, level, and wave');
assert.equal(planRareChaosVisitorSpawn({ seed: 'forced', config: standardWave, force: true }).shouldSpawn, true);

const rareCodex = getThreatCodexCatalog().enemies.filter((entry) => entry.id.startsWith('rare_chaos_visitor_'));
assert.equal(rareCodex.length, 99, 'all rare variants must have individual Codex entries');
assert.equal(new Set(rareCodex.map((entry) => entry.id)).size, 99);
assert.equal(rareChaosVisitorVoiceLines.length, 12);
assert.ok(rareChaosVisitorVoiceLines.every((line) => /terror|dread/.test(line.generationText) && /no comedy/.test(line.generationText) && !/funny/.test(line.generationText)), 'rare contact voice direction must stay frightening');
assert.equal(SFX_CATALOG.boss_rare_chaos_visitor_warning.length, 12);
assert.ok(VOICE_MIX.boss_rare_chaos_visitor_warning?.priority >= 9);

const sfxFiles = [
  'nova_rare_visitor_arrival.mp3',
  'nova_rare_visitor_theme_sting.mp3',
  'nova_rare_visitor_laser_charge.mp3',
  'nova_rare_visitor_laser_fire.mp3',
  'nova_rare_visitor_barrage.mp3',
  'nova_rare_visitor_armor_crack.mp3',
  'nova_rare_visitor_defeat.mp3',
  'nova_rare_visitor_reward.mp3'
];
for (const filename of sfxFiles) {
  const manifestPath = `/audio/sfx/nova-swarm/${filename}`;
  assert.ok(AssetManifest.audio.sfx.includes(manifestPath), `asset manifest missing ${filename}`);
  assert.ok(existsSync(path.join(root, 'public', manifestPath)), `generated SFX missing ${filename}`);
  const key = filename.replace(/^nova_/, '').replace(/\.mp3$/, '');
  assert.ok(SFX_MIX[key], `SFX mix missing ${key}`);
  assert.ok(SFX_CATALOG[key]?.length, `SFX catalog missing ${key}`);
}
for (const line of rareChaosVisitorVoiceLines) {
  const manifestPath = `/audio/voice/rare-chaos-visitors/${line.id}.mp3`;
  assert.ok(AssetManifest.audio.voice.includes(manifestPath), `voice manifest missing ${line.id}`);
  assert.ok(existsSync(path.join(root, 'public', manifestPath)), `generated voice missing ${line.id}`);
}

const themeDuration = Number(spawnSync('ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1',
  path.join(root, 'public/audio/sfx/nova-swarm/nova_rare_visitor_theme_sting.mp3')
], { encoding: 'utf8' }).stdout.trim());
assert.ok(themeDuration >= 8.5 && themeDuration <= 9.5, `mini-theme should be about nine seconds, got ${themeDuration}`);
assert.match(generatorSource, /ELEVENLABS_API_KEY \|\| process\.env\.ELEVEN_LABS_API_KEY/);
assert.doesNotMatch(generatorSource, /xi-api-key['"]?\s*:\s*['"][^'"]+['"]/, 'generator must never hardcode an API key');
assert.match(managerSource, /planRareChaosVisitorSpawn/);
assert.match(managerSource, /rareFireMultiplier = enemy\.isRareChaosVisitor \? 2\.45 : 1/);
assert.match(enemySource, /EXTINCTION CONTACT|rare_visitor_laser_fire/);
assert.match(sceneSource, /SURVIVE THREE ESCALATION PHASES/);
assert.match(sceneSource, /__novaForceRareChaosVisitor/);
assert.match(sceneSource, /completeRareChaosVisitor/);

console.log('[check-rare-chaos-visitors] ok: exact chance, 99 variants, Codex, combat hooks, 20 generated audio assets, and debug route verified');
