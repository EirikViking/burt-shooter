import { existsSync } from 'node:fs';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
const root = path.resolve('.');
const outputDir = path.join(root, 'public/audio/sfx/nova-swarm');
const metadataDir = path.join(root, 'public/audio/generated/tactical-augments');
const modelId = process.env.ELEVENLABS_SFX_MODEL_ID || 'eleven_text_to_sound_v2';
const outputFormat = process.env.ELEVENLABS_SFX_OUTPUT_FORMAT || 'mp3_44100_128';
const force = process.argv.includes('--force');

const assets = [
  ['nova_tactical_phase_reactor.mp3', 0.55, 'Original arcade phase-reactor selection sting: a crystalline spacetime snap immediately charging one bright cannon capacitor, punchy sci-fi UI sound, no voice, no melody.'],
  ['nova_tactical_focus_lens.mp3', 0.55, 'Original precision lens-lock UI sting: glass aperture closes, clean golden target ping, tiny laser focus shimmer, no voice, no melody.'],
  ['nova_tactical_inertial_dampers.mp3', 0.6, 'Original sci-fi inertial damper selection sound: heavy gyroscope spins once and settles into a smooth magnetic hum, compact arcade UI sting, no voice.'],
  ['nova_tactical_phase_wake.mp3', 0.6, 'Original phase wake UI sting: short reversed vacuum sweep, soft dimensional bubble pop, hostile sparks erased, crisp and rewarding, no voice.'],
  ['nova_tactical_slipstream_coils.mp3', 0.6, 'Original slipstream coil selection sound: two accelerating electric coils cross and resolve in a fast cyan chirp, compact arcade UI sting, no voice.'],
  ['nova_tactical_emergency_bulkhead.mp3', 0.7, 'Original emergency bulkhead UI sting: armored hatch slams shut followed by a clean protective shield bloom, heavy but short, no alarm voice.'],
  ['nova_tactical_impact_foam.mp3', 0.55, 'Original impact foam selection sound: playful pneumatic pop, expanding safety foam fizz, then a sturdy hull knock, polished sci-fi arcade UI, no voice.'],
  ['nova_tactical_graze_plating.mp3', 0.8, 'Original graze plating reward sting: six very fast metallic spark ticks fuse into one bright shield snap, gratifying arcade timing, no voice, no melody.'],
  ['nova_tactical_last_light.mp3', 0.65, 'Original last-light selection sting: one low warning pulse rises into a determined phase-drive charge, tense then hopeful, compact sci-fi arcade UI, no voice.'],
  ['nova_tactical_combo_anchor.mp3', 0.65, 'Original combo anchor selection sound: small metal anchor clank, chain catches, digital timer locks in place with a warm arcade ping, no voice.'],
  ['nova_tactical_salvage_clock.mp3', 0.65, 'Original salvage clock selection sound: tiny mechanical clock winds backward and releases a bright pickup sparkle, playful sci-fi UI sting, no voice.'],
  ['nova_tactical_power_saver.mp3', 0.6, 'Original power saver selection sting: systems briefly power down, conserved energy folds back into a strong green synth resolve, no voice, no melody.'],
  ['nova_tactical_drone_link.mp3', 0.65, 'Original drone link selection sting: three distinct robotic handshake chirps connect to one strong targeting lock, friendly tactical arcade UI, no voice.'],
  ['nova_row_core_viking_row.mp3', 4.8, "Original fictional stadium-sized Viking rowing ritual for a sci-fi arcade game. Begin with one loud deep Nordic horn blast, then exactly two massive bass drum hits. A large unified crowd then shouts exactly 'RO! RO! RO!' three times, each shout louder and closer together, with synchronized rowing rhythm and a thunderous final impact. No other words, no song, no real recording, no team or tournament audio."]
].map(([file, duration_seconds, text]) => ({ file, duration_seconds, text }));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(asset, attempt = 1) {
  const url = new URL('https://api.elevenlabs.io/v1/sound-generation');
  url.searchParams.set('output_format', outputFormat);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: asset.text, duration_seconds: asset.duration_seconds, prompt_influence: 0.62, model_id: modelId })
  });
  if (response.ok) return Buffer.from(await response.arrayBuffer());
  const body = await response.text().catch(() => '');
  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    await sleep(900 * attempt);
    return request(asset, attempt + 1);
  }
  throw new Error(`ElevenLabs failed for ${asset.file}: HTTP ${response.status} ${body.slice(0, 180)}`);
}

async function normalize(rawPath, targetPath, loud = false) {
  const result = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', rawPath,
    '-af', `loudnorm=I=${loud ? -13 : -16}:TP=-1.2:LRA=9`,
    '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '128k', targetPath
  ], { encoding: 'utf8' });
  await unlink(rawPath).catch(() => {});
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${path.basename(targetPath)}: ${result.stderr}`);
}

async function main() {
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is required in the environment.');
  await mkdir(outputDir, { recursive: true });
  const results = [];
  for (const asset of assets) {
    const target = path.join(outputDir, asset.file);
    if (!force && existsSync(target)) {
      results.push({ ...asset, skipped: true });
      continue;
    }
    const raw = `${target}.raw`;
    await writeFile(raw, await request(asset));
    await normalize(raw, target, asset.file.includes('viking_row'));
    results.push({ ...asset, skipped: false });
    console.log(`generated ${asset.file}`);
    await sleep(650);
  }
  await mkdir(metadataDir, { recursive: true });
  await writeFile(path.join(metadataDir, 'tactical-augment-audio-manifest.json'), `${JSON.stringify({
    feature: 'Tactical augments and Viking Row',
    generatedAt: new Date().toISOString(),
    legalNote: 'Original ElevenLabs-generated assets. No real stadium, supporter, broadcast, team, song, or tournament recording was used.',
    modelId,
    outputFormat,
    files: results
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
