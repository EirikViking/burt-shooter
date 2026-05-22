import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { AssetManifest } from '../src/assets/assetManifest.js';
import {
  MUSIC_PLAYLISTS,
  SFX_CATALOG,
  SFX_MIX,
  VOICE_EVENT_FALLBACKS,
  VOICE_MIX
} from '../src/audio/SoundCatalog.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(rootDir, 'public');
const audioManagerPath = path.join(rootDir, 'src', 'audio', 'AudioManager.js');
const nullSink = process.platform === 'win32' ? 'NUL' : '/dev/null';

const errors = [];
const warnings = [];
const args = parseArgs(process.argv.slice(2));

const defaultMix = readAudioDefaults();
const measuredFiles = new Map();
const rows = [];

if (args.help) {
  printHelp();
  process.exit(0);
}

if (errors.length) {
  console.error('[audio-mix] failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (!hasFfmpeg()) {
  console.error('[audio-mix] failed: ffmpeg is required for this audit and was not found on PATH');
  process.exit(1);
}

collectMusicRows();
collectSfxRows();
collectVoiceRows();
collectCatalogOnlyVoiceRows();
assertVoiceAssetCoverage();

for (const row of rows) {
  const measurement = measureUrl(row.url);
  row.durationSeconds = measurement?.durationSeconds ?? null;
  row.rawMeanDb = measurement?.meanDb ?? null;
  row.rawPeakDb = measurement?.maxDb ?? null;
  row.gainDb = linearToDb(row.effectiveLinear);
  row.effectiveMeanDb = Number.isFinite(row.rawMeanDb) ? row.rawMeanDb + row.gainDb : null;
  row.effectivePeakDb = Number.isFinite(row.rawPeakDb) ? row.rawPeakDb + row.gainDb : null;
}

addObjectiveWarnings();

const report = buildReport();

if (args.jsonPath) {
  writeTextFile(args.jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[audio-mix] wrote JSON report: ${path.relative(rootDir, path.resolve(rootDir, args.jsonPath))}`);
}

if (args.mdPath) {
  writeTextFile(args.mdPath, renderMarkdown(report));
  console.log(`[audio-mix] wrote Markdown report: ${path.relative(rootDir, path.resolve(rootDir, args.mdPath))}`);
}

printConsoleSummary(report);

if (errors.length || (args.failOnWarnings && warnings.length)) {
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {
    failOnWarnings: false,
    help: false,
    jsonPath: null,
    mdPath: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--fail-on-warnings') {
      parsed.failOnWarnings = true;
    } else if (arg === '--json') {
      parsed.jsonPath = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === '--md') {
      parsed.mdPath = requireValue(argv, index, arg);
      index += 1;
    } else {
      errors.push(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function requireValue(argv, index, name) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    errors.push(`${name} requires a path`);
    return null;
  }
  return value;
}

function printHelp() {
  console.log(`Usage: node scripts/audit-audio-mix.mjs [--md <path>] [--json <path>] [--fail-on-warnings]

Measures every referenced music, SFX, and voice asset with FFmpeg volumedetect,
then reports the default in-game effective mean and peak levels.

This is an objective release audit, not a replacement for a by-ear mix pass.`);
}

function hasFfmpeg() {
  const result = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  return result.status === 0;
}

function readAudioDefaults() {
  const defaults = {
    masterVolume: 0.3,
    musicVolume: 0.2,
    sfxVolume: 0.4,
    voiceVolume: 0.45
  };

  if (!fs.existsSync(audioManagerPath)) {
    warnings.push({
      type: 'config',
      event: 'AudioManager',
      url: audioManagerPath,
      message: 'AudioManager.js was not found; using built-in default volume assumptions'
    });
    return defaults;
  }

  const source = fs.readFileSync(audioManagerPath, 'utf8');
  for (const key of Object.keys(defaults)) {
    const match = source.match(new RegExp(`this\\.${key}\\s*=\\s*([0-9.]+)\\s*;`));
    if (match) {
      defaults[key] = Number(match[1]);
    } else {
      warnings.push({
        type: 'config',
        event: 'AudioManager',
        url: audioManagerPath,
        message: `Could not parse AudioManager default ${key}; using ${defaults[key]}`
      });
    }
  }

  return defaults;
}

function collectMusicRows() {
  for (const [context, playlist] of Object.entries(MUSIC_PLAYLISTS)) {
    for (const url of asArray(playlist).filter(Boolean)) {
      rows.push({
        type: 'music',
        event: context,
        url,
        mixVolume: 1,
        duckFactor: null,
        effectiveLinear: defaultMix.masterVolume * defaultMix.musicVolume
      });
    }
  }
}

function collectSfxRows() {
  for (const [event, mix] of Object.entries(SFX_MIX)) {
    const urls = asArray(SFX_CATALOG[event]).filter(Boolean);
    if (!urls.length) {
      errors.push(`SFX event "${event}" has no catalog assets`);
      continue;
    }

    for (const url of urls) {
      rows.push({
        type: 'sfx',
        event,
        url,
        mixVolume: numeric(mix.volume, 1),
        minIntervalMs: numeric(mix.minIntervalMs, 0),
        duckFactor: null,
        effectiveLinear: defaultMix.masterVolume * defaultMix.sfxVolume * numeric(mix.volume, 1)
      });
    }
  }
}

function collectVoiceRows() {
  for (const [event, mix] of Object.entries(VOICE_MIX)) {
    const urls = resolveVoiceUrls(event);
    if (!urls.length) {
      errors.push(`Voice event "${event}" has no voice asset`);
      continue;
    }

    for (const url of urls) {
      rows.push({
        type: 'voice',
        event,
        url,
        mixVolume: numeric(mix.volume, 1),
        duckFactor: numeric(mix.duckFactor, 1),
        cooldownMs: numeric(mix.cooldownMs, 0),
        effectiveLinear: defaultMix.masterVolume * defaultMix.voiceVolume * numeric(mix.volume, 1)
      });
    }
  }
}

function collectCatalogOnlyVoiceRows() {
  const coveredUrls = new Set(rows
    .filter((row) => row.type === 'voice')
    .map((row) => row.url));

  for (const [event, urls] of Object.entries(SFX_CATALOG)) {
    const voiceUrls = uniqueUrls(asArray(urls)
      .filter((url) => typeof url === 'string' && url.includes('/audio/voice/')))
      .filter((url) => !coveredUrls.has(url));
    if (!voiceUrls.length) continue;

    const mix = VOICE_MIX[event] || {};
    for (const url of voiceUrls) {
      rows.push({
        type: 'voice',
        event,
        url,
        mixVolume: numeric(mix.volume, 1),
        duckFactor: numeric(mix.duckFactor, 1),
        cooldownMs: numeric(mix.cooldownMs, 0),
        effectiveLinear: defaultMix.masterVolume * defaultMix.voiceVolume * numeric(mix.volume, 1)
      });
      coveredUrls.add(url);
    }
  }
}

function resolveVoiceUrls(event) {
  const catalogUrls = uniqueUrls(asArray(SFX_CATALOG[event])
    .filter(Boolean)
    .filter((url) => typeof url === 'string' && url.includes('/audio/voice/')));
  if (catalogUrls.length) return catalogUrls;

  const fallback = VOICE_EVENT_FALLBACKS[event];
  if (fallback) {
    const match = AssetManifest.audio.voice.find((url) => url.endsWith(`/${fallback}`) || url.endsWith(fallback));
    if (match) return [match];
  }

  return [];
}

function uniqueUrls(urls) {
  return Array.from(new Set(urls));
}

function assertVoiceAssetCoverage() {
  const manifestVoices = new Set(AssetManifest.audio.voice.filter((url) => typeof url === 'string' && url.includes('/audio/voice/')));
  const measuredVoices = new Set(rows
    .filter((row) => row.type === 'voice')
    .map((row) => row.url));
  const missing = [...manifestVoices].filter((url) => !measuredVoices.has(url));
  if (missing.length) {
    errors.push(`Voice mix audit missed ${missing.length} manifest voice asset(s): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ', ...' : ''}`);
  }
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function numeric(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function publicFileFor(url) {
  return path.join(publicDir, String(url).replace(/^\//, ''));
}

function measureUrl(url) {
  if (measuredFiles.has(url)) {
    return measuredFiles.get(url);
  }

  const filePath = publicFileFor(url);
  if (!url || typeof url !== 'string' || !url.startsWith('/audio/')) {
    errors.push(`Invalid audio URL: ${url}`);
    measuredFiles.set(url, null);
    return null;
  }

  if (!fs.existsSync(filePath)) {
    errors.push(`Missing audio file: ${url}`);
    measuredFiles.set(url, null);
    return null;
  }

  const result = spawnSync('ffmpeg', [
    '-hide_banner',
    '-nostats',
    '-i',
    filePath,
    '-af',
    'volumedetect',
    '-f',
    'null',
    nullSink
  ], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 8
  });

  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.status !== 0) {
    errors.push(`FFmpeg could not decode ${url}`);
    measuredFiles.set(url, null);
    return null;
  }

  const durationSeconds = parseDuration(output);
  const meanDb = parseDb(output, 'mean_volume');
  const maxDb = parseDb(output, 'max_volume');

  if (!Number.isFinite(meanDb) || !Number.isFinite(maxDb)) {
    errors.push(`FFmpeg did not report mean/max volume for ${url}`);
  }

  const measurement = { durationSeconds, meanDb, maxDb };
  measuredFiles.set(url, measurement);
  return measurement;
}

function parseDuration(output) {
  const match = output.match(/Duration:\s*(\d+):(\d+):([0-9.]+)/);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function parseDb(output, key) {
  const match = output.match(new RegExp(`${key}:\\s*(-?[0-9.]+) dB`));
  return match ? Number(match[1]) : null;
}

function linearToDb(value) {
  const clamped = Math.max(Number(value) || 0, 0.000001);
  return 20 * Math.log10(clamped);
}

function addObjectiveWarnings() {
  const musicRows = rows.filter((row) => row.type === 'music' && Number.isFinite(row.rawPeakDb));
  const loudestRawMusicPeak = musicRows.length
    ? Math.max(...musicRows.map((row) => row.rawPeakDb))
    : null;

  for (const row of rows) {
    if (row.rawPeakDb !== null && row.rawPeakDb > -0.1) {
      warnings.push({
        type: row.type,
        event: row.event,
        url: row.url,
        message: `raw peak is very close to full scale (${formatDb(row.rawPeakDb)})`
      });
    }

    if (row.durationSeconds !== null && row.durationSeconds < 0.05) {
      warnings.push({
        type: row.type,
        event: row.event,
        url: row.url,
        message: `duration is extremely short (${row.durationSeconds.toFixed(3)}s)`
      });
    }

    if (row.type === 'music' && row.effectiveMeanDb !== null && row.effectiveMeanDb < -50) {
      warnings.push({
        type: row.type,
        event: row.event,
        url: row.url,
        message: `effective mean is likely too quiet for music (${formatDb(row.effectiveMeanDb)})`
      });
    }

    if (row.type === 'sfx') {
      addSfxWarning(row);
    }

    if (row.type === 'voice') {
      addVoiceWarning(row, loudestRawMusicPeak);
    }
  }
}

function addSfxWarning(row) {
  const criticalSfx = new Set([
    'shoot_small',
    'shoot_heavy',
    'enemy_explode',
    'boss_explode',
    'playerHit',
    'achievement',
    'levelComplete',
    'boss_spawn',
    'pickup',
    'powerup'
  ]);

  if (row.effectivePeakDb !== null && row.effectivePeakDb > -14) {
    warnings.push({
      type: row.type,
      event: row.event,
      url: row.url,
      message: `effective SFX peak is hot (${formatDb(row.effectivePeakDb)})`
    });
  }

  if (criticalSfx.has(row.event) && row.effectivePeakDb !== null && row.effectivePeakDb < -36) {
    warnings.push({
      type: row.type,
      event: row.event,
      url: row.url,
      message: `critical SFX effective peak is low (${formatDb(row.effectivePeakDb)})`
    });
  }
}

function addVoiceWarning(row, loudestRawMusicPeak) {
  if (row.effectivePeakDb !== null && row.effectivePeakDb > -12) {
    warnings.push({
      type: row.type,
      event: row.event,
      url: row.url,
      message: `effective voice peak is hot (${formatDb(row.effectivePeakDb)})`
    });
  }

  if (!Number.isFinite(loudestRawMusicPeak) || row.effectivePeakDb === null) return;

  const duckedMusicPeak = loudestRawMusicPeak
    + linearToDb(defaultMix.masterVolume * defaultMix.musicVolume * numeric(row.duckFactor, 1));
  const headroomOverDuckedMusic = row.effectivePeakDb - duckedMusicPeak;

  if (headroomOverDuckedMusic < 3) {
    warnings.push({
      type: row.type,
      event: row.event,
      url: row.url,
      message: `voice peak is only ${headroomOverDuckedMusic.toFixed(1)} dB over estimated ducked music`
    });
  }
}

function buildReport() {
  const groups = {
    music: rows.filter((row) => row.type === 'music'),
    sfx: rows.filter((row) => row.type === 'sfx'),
    voice: rows.filter((row) => row.type === 'voice')
  };

  return {
    generatedAt: new Date().toISOString(),
    defaults: {
      masterVolume: defaultMix.masterVolume,
      musicVolume: defaultMix.musicVolume,
      sfxVolume: defaultMix.sfxVolume,
      voiceVolume: defaultMix.voiceVolume,
      effective: {
        music: defaultMix.masterVolume * defaultMix.musicVolume,
        sfxBase: defaultMix.masterVolume * defaultMix.sfxVolume,
        voiceBase: defaultMix.masterVolume * defaultMix.voiceVolume
      }
    },
    counts: {
      measuredFiles: Array.from(measuredFiles.values()).filter(Boolean).length,
      musicRows: groups.music.length,
      sfxRows: groups.sfx.length,
      voiceRows: groups.voice.length,
      warnings: warnings.length,
      errors: errors.length
    },
    loudestEffectivePeaks: {
      music: topRows(groups.music, 8),
      sfx: topRows(groups.sfx, 10),
      voice: topRows(groups.voice, 8)
    },
    quietestEffectivePeaks: {
      sfx: bottomRows(groups.sfx, 8),
      voice: bottomRows(groups.voice, 8)
    },
    warnings,
    errors,
    rows: rows.map(toPublicRow)
  };
}

function toPublicRow(row) {
  return {
    type: row.type,
    event: row.event,
    url: row.url,
    durationSeconds: round(row.durationSeconds, 3),
    mixVolume: round(row.mixVolume, 3),
    duckFactor: row.duckFactor === null ? null : round(row.duckFactor, 3),
    effectiveLinear: round(row.effectiveLinear, 5),
    rawMeanDb: round(row.rawMeanDb, 1),
    rawPeakDb: round(row.rawPeakDb, 1),
    gainDb: round(row.gainDb, 1),
    effectiveMeanDb: round(row.effectiveMeanDb, 1),
    effectivePeakDb: round(row.effectivePeakDb, 1)
  };
}

function topRows(list, count) {
  return list
    .filter((row) => Number.isFinite(row.effectivePeakDb))
    .sort((a, b) => b.effectivePeakDb - a.effectivePeakDb)
    .slice(0, count)
    .map(toPublicRow);
}

function bottomRows(list, count) {
  return list
    .filter((row) => Number.isFinite(row.effectivePeakDb))
    .sort((a, b) => a.effectivePeakDb - b.effectivePeakDb)
    .slice(0, count)
    .map(toPublicRow);
}

function round(value, places) {
  if (!Number.isFinite(value)) return null;
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function formatDb(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} dB` : 'n/a';
}

function writeTextFile(targetPath, contents) {
  if (!targetPath) return;
  const resolved = path.resolve(rootDir, targetPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, contents, 'utf8');
}

function renderMarkdown(report) {
  const lines = [
    `# Audio Mix Audit - ${report.generatedAt.slice(0, 10)}`,
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'This FFmpeg `volumedetect` pass measures referenced music, SFX, and voice files, then applies the current default in-game volume multipliers. It is objective release evidence, not a final by-ear approval.',
    '',
    '## Defaults',
    '',
    `- Master: ${report.defaults.masterVolume}`,
    `- Music: ${report.defaults.musicVolume} (effective ${report.defaults.effective.music.toFixed(3)})`,
    `- SFX base: ${report.defaults.sfxVolume} (effective ${report.defaults.effective.sfxBase.toFixed(3)} before per-event mix)`,
    `- Voice base: ${report.defaults.voiceVolume} (effective ${report.defaults.effective.voiceBase.toFixed(3)} before per-event mix)`,
    '',
    '## Coverage',
    '',
    `- Measured files: ${report.counts.measuredFiles}`,
    `- Music rows: ${report.counts.musicRows}`,
    `- SFX rows: ${report.counts.sfxRows}`,
    `- Voice rows: ${report.counts.voiceRows}`,
    `- Warnings: ${report.counts.warnings}`,
    `- Errors: ${report.counts.errors}`,
    '',
    '## Loudest Effective Peaks',
    '',
    '### Music',
    '',
    renderTable(report.loudestEffectivePeaks.music),
    '',
    '### SFX',
    '',
    renderTable(report.loudestEffectivePeaks.sfx),
    '',
    '### Voice',
    '',
    renderTable(report.loudestEffectivePeaks.voice),
    '',
    '## Quietest Effective Peaks',
    '',
    '### SFX',
    '',
    renderTable(report.quietestEffectivePeaks.sfx),
    '',
    '### Voice',
    '',
    renderTable(report.quietestEffectivePeaks.voice),
    '',
    '## Warnings',
    ''
  ];

  if (report.warnings.length) {
    for (const warning of report.warnings) {
      lines.push(`- ${warning.type}:${warning.event} ${warning.url} - ${warning.message}`);
    }
  } else {
    lines.push('- None.');
  }

  lines.push(
    '',
    '## Remaining Manual Check',
    '',
    '- Listen through menu, normal gameplay, wave clear, boss inbound, boss fight, victory, and game over on headphones or speakers.',
    '- Confirm mission-control calls are intelligible when music ducks and combat SFX are active.',
    '- Confirm repeated player shots and explosions feel energetic without becoming tiring over a 10-15 minute run.'
  );

  return `${lines.join('\n')}\n`;
}

function renderTable(list) {
  if (!list.length) return 'No rows.';

  const lines = [
    '| Type | Event | File | Raw peak | Effective peak | Effective mean |',
    '| --- | --- | --- | ---: | ---: | ---: |'
  ];

  for (const row of list) {
    lines.push(`| ${row.type} | ${row.event} | ${path.basename(row.url)} | ${formatDb(row.rawPeakDb)} | ${formatDb(row.effectivePeakDb)} | ${formatDb(row.effectiveMeanDb)} |`);
  }

  return lines.join('\n');
}

function printConsoleSummary(report) {
  if (errors.length) {
    console.error('[audio-mix] failed');
    for (const error of errors) console.error(`- ${error}`);
  }

  console.log(`[audio-mix] measured ${report.counts.measuredFiles} files across ${report.counts.musicRows} music, ${report.counts.sfxRows} SFX, and ${report.counts.voiceRows} voice rows`);
  console.log(`[audio-mix] defaults: master ${report.defaults.masterVolume}, music ${report.defaults.musicVolume}, sfx ${report.defaults.sfxVolume}, voice ${report.defaults.voiceVolume}`);
  console.log('[audio-mix] loudest effective peaks:');
  printTopLine('music', report.loudestEffectivePeaks.music);
  printTopLine('sfx', report.loudestEffectivePeaks.sfx);
  printTopLine('voice', report.loudestEffectivePeaks.voice);

  if (warnings.length) {
    console.warn(`[audio-mix] warnings: ${warnings.length}`);
    for (const warning of warnings.slice(0, 20)) {
      console.warn(`- ${warning.type}:${warning.event} ${path.basename(warning.url)} - ${warning.message}`);
    }
    if (warnings.length > 20) {
      console.warn(`- ... ${warnings.length - 20} more warnings in the full report`);
    }
  } else {
    console.log('[audio-mix] warnings: none');
  }
}

function printTopLine(label, list) {
  const rendered = list
    .slice(0, 3)
    .map((row) => `${row.event}/${path.basename(row.url)} ${formatDb(row.effectivePeakDb)}`)
    .join('; ');
  console.log(`  ${label}: ${rendered || 'n/a'}`);
}
