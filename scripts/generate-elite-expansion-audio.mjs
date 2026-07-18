import { existsSync } from 'node:fs';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { ELITE_MIDDLE_SHIP_EXPANSION } from '../src/config/EliteMiddleShipExpansion.js';

const apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
const root = path.resolve('.');
const sfxDir = path.join(root, 'public/audio/sfx/nova-swarm');
const metadataDir = path.join(root, 'public/audio/generated/elite-expansion');
const outputFormat = 'mp3_44100_128';
const modelId = process.env.ELEVENLABS_SFX_MODEL_ID || 'eleven_text_to_sound_v2';
const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');
const delayMs = Math.max(0, Number(process.env.ELEVENLABS_ELITE_EXPANSION_DELAY_MS || 650));

const familySound = Object.freeze({
  prism_barrage: 'a crystalline plasma fan opening with sharp refracted pings and one clean prismatic discharge',
  meteor_bloom: 'a deep artillery chamber unlocking, three hot orbital shells igniting, and a compact seismic launch',
  hunter_dash: 'a predatory targeting chirp, razor-fast engine surge, and violent Doppler blade pass',
  satellite_ring: 'multiple magnetic weapon nodes spinning into formation, locking in sequence, then snapping outward',
  stasis_lattice: 'an impossible clock mechanism slowing down, cold temporal glass tension, and a heavy time-lock pulse',
  siphon_tether: 'hungry energy collectors opening, two vacuum tethers latching, and a dark reversed reactor inhale',
  resonance_command: 'a tactical signal crown unfolding, layered encrypted command tones, and a disciplined battle pulse',
  warp_ambush: 'a short spatial tear, two deceptive phase echoes, and a sudden knife-like re-entry crack',
  ion_shear: 'crossed ion rails charging from opposite sides, a bright electrical scissor cut, and a tight plasma tail',
  siege_beacon: 'heavy ordnance doors cycling, a hostile targeting grid acquiring, and a massive compact arsenal launch'
});

const variantTexture = Object.freeze([
  'light, fast, and highly readable with two distinct warning beats',
  'heavier and more dangerous with three distinct mechanical layers',
  'catastrophic final-tier weight, deeper bass, denser machinery, and an unmistakable final impact'
]);

const durationByFamily = Object.freeze({
  prism_barrage: 1.05,
  meteor_bloom: 1.25,
  hunter_dash: 0.9,
  satellite_ring: 1.2,
  stasis_lattice: 1.35,
  siphon_tether: 1.25,
  resonance_command: 1.15,
  warp_ambush: 0.95,
  ion_shear: 1.0,
  siege_beacon: 1.35
});

const assets = ELITE_MIDDLE_SHIP_EXPANSION.map((profile, index) => ({
  id: profile.id,
  displayName: profile.displayName,
  family: profile.specialAbility,
  variant: profile.abilityVariant,
  file: `nova_${profile.sfx.active}.mp3`,
  duration_seconds: durationByFamily[profile.specialAbility] + profile.abilityVariant * 0.08,
  text: [
    `Original polished science-fiction arcade elite activation sound for ${profile.displayName}:`,
    familySound[profile.specialAbility],
    variantTexture[profile.abilityVariant],
    `unique sonic signature number ${index + 21}; no voice, no music, no recognizable franchise sound, short dry tail, powerful but not painfully harsh.`
  ].join(' ')
}));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(asset, attempt = 1) {
  const url = new URL('https://api.elevenlabs.io/v1/sound-generation');
  url.searchParams.set('output_format', outputFormat);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: asset.text,
      duration_seconds: asset.duration_seconds,
      prompt_influence: 0.68,
      model_id: modelId
    })
  });
  if (response.ok) return Buffer.from(await response.arrayBuffer());
  const detail = await response.text().catch(() => '');
  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    await sleep(delayMs * (attempt + 1));
    return request(asset, attempt + 1);
  }
  throw new Error(`ElevenLabs generation failed for ${asset.file}: HTTP ${response.status} ${detail.slice(0, 220)}`);
}

async function normalize(raw, target) {
  const result = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', raw,
    '-af', 'loudnorm=I=-16:TP=-1.2:LRA=7',
    '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '128k', target
  ], { encoding: 'utf8' });
  if (result.status !== 0) {
    if (!existsSync(target) && existsSync(raw)) await rename(raw, target);
    throw new Error(`ffmpeg normalization failed for ${path.basename(target)}: ${result.stderr || result.error?.message || 'unknown error'}`);
  }
  await unlink(raw).catch(() => {});
}

async function main() {
  if (assets.length !== 30) throw new Error(`Expected 30 elite SFX definitions, found ${assets.length}`);
  if (dryRun) {
    assets.forEach((asset) => console.log(`${asset.file}: ${asset.text}`));
    return;
  }
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY or ELEVEN_LABS_API_KEY is required. Keep it in the environment; never print or commit it.');
  }

  await mkdir(sfxDir, { recursive: true });
  const results = [];
  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    const target = path.join(sfxDir, asset.file);
    if (!force && existsSync(target)) {
      results.push({ ...asset, path: path.relative(root, target).replaceAll(path.sep, '/'), skipped: true });
      continue;
    }
    const raw = `${target}.raw`;
    const buffer = await request(asset);
    await writeFile(raw, buffer);
    await normalize(raw, target);
    results.push({ ...asset, path: path.relative(root, target).replaceAll(path.sep, '/'), bytes: buffer.length, skipped: false });
    console.log(`[${index + 1}/${assets.length}] generated ${asset.file} (${buffer.length} bytes)`);
    if (index < assets.length - 1 && delayMs > 0) await sleep(delayMs);
  }

  await mkdir(metadataDir, { recursive: true });
  const manifest = {
    feature: 'Nova Swarm Elite Expansion',
    generatedAt: new Date().toISOString(),
    legalNote: 'Original generated development assets. No celebrity, song, film, broadcast, franchise, or third-party recording was requested or used.',
    outputFormat,
    modelId,
    files: results
  };
  await writeFile(path.join(metadataDir, 'elite-expansion-audio-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[elite-expansion-audio] complete generated=${results.filter((item) => !item.skipped).length} skipped=${results.filter((item) => item.skipped).length}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
