import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { THREAT_CODEX_CATEGORIES, getThreatCodexCatalog } from '../src/config/ThreatCodexCatalog.js';
import { AssetManifest } from '../src/assets/assetManifest.js';
import { SFX_CATALOG, SFX_MIX } from '../src/audio/SoundCatalog.js';
import { ShipData } from '../src/config/ShipData.js';
import { buildSelectableShipVariants } from '../src/config/VisualVariantCatalog.js';
import { getShipUnlockDefinition } from '../src/config/ShipUnlockConfig.js';
import { getTraitDetailLines } from '../src/config/ShipTraitDescriptions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'test-results', 'codex-revamp-20260606');
const failures = [];

function fail(message) {
  failures.push(message);
}

function textOf(entry) {
  return `${entry.name || ''} ${entry.role || ''} ${entry.rarity || ''} ${entry.description || ''} ${entry.tip || ''}`;
}

function includesAny(text, words) {
  const lower = String(text || '').toLowerCase();
  return words.some((word) => lower.includes(word));
}

function dataSvgDimensions(src) {
  const match = String(src || '').match(/^data:image\/svg\+xml[^,]*,(.+)$/);
  if (!match) return null;
  const decoded = decodeURIComponent(match[1]);
  const width = Number(decoded.match(/\bwidth="(\d+)"/)?.[1]);
  const height = Number(decoded.match(/\bheight="(\d+)"/)?.[1]);
  return Number.isFinite(width) && Number.isFinite(height) ? { width, height, type: 'svg-data' } : null;
}

function diskSvgDimensions(buffer) {
  const text = buffer.toString('utf8', 0, Math.min(buffer.length, 2048));
  if (!/<svg\b/i.test(text)) return null;
  const width = Number(text.match(/\bwidth="(\d+)"/i)?.[1]);
  const height = Number(text.match(/\bheight="(\d+)"/i)?.[1]);
  return Number.isFinite(width) && Number.isFinite(height) ? { width, height, type: 'svg-file' } : null;
}

function readUint24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function imageDimensions(file) {
  const buffer = readFileSync(file);
  const svg = diskSvgDimensions(buffer);
  if (svg) return svg;
  if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return {
      type: 'png',
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }
  if (buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    let offset = 12;
    while (offset + 8 <= buffer.length) {
      const chunk = buffer.toString('ascii', offset, offset + 4);
      const size = buffer.readUInt32LE(offset + 4);
      const data = offset + 8;
      if (chunk === 'VP8X' && data + 10 <= buffer.length) {
        return {
          type: 'webp-vp8x',
          width: readUint24LE(buffer, data + 4) + 1,
          height: readUint24LE(buffer, data + 7) + 1
        };
      }
      if (chunk === 'VP8 ' && data + 10 <= buffer.length) {
        return {
          type: 'webp-vp8',
          width: buffer.readUInt16LE(data + 6) & 0x3fff,
          height: buffer.readUInt16LE(data + 8) & 0x3fff
        };
      }
      if (chunk === 'VP8L' && data + 5 <= buffer.length) {
        const bits = buffer.readUInt32LE(data + 1);
        return {
          type: 'webp-vp8l',
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1
        };
      }
      offset += 8 + size + (size % 2);
    }
  }
  return null;
}

function wavDurationSeconds(file) {
  const buffer = readFileSync(file);
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    return null;
  }
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);
  const dataIndex = buffer.indexOf(Buffer.from('data'));
  if (dataIndex < 0 || dataIndex + 8 > buffer.length) return null;
  const dataSize = buffer.readUInt32LE(dataIndex + 4);
  const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);
  return bytesPerSecond > 0 ? dataSize / bytesPerSecond : null;
}

function normalizedWords(text) {
  const stop = new Set([
    'sector', 'sectors', 'the', 'and', 'that', 'with', 'from', 'this', 'because', 'waves', 'boss', 'gate',
    'lives', 'life', 'gameplay', 'clue', 'matters', 'run', 'route', 'all', 'every', 'here', 'note', 'flavor'
  ]);
  return new Set(String(text || '').toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 3 && !stop.has(word)) || []);
}

function jaccard(a, b) {
  const left = normalizedWords(a);
  const right = normalizedWords(b);
  const union = new Set([...left, ...right]);
  if (!union.size) return 0;
  let intersection = 0;
  for (const word of left) {
    if (right.has(word)) intersection += 1;
  }
  return intersection / union.size;
}

function checkCodexSfx() {
  const codexAsset = '/audio/sfx/nova-swarm/nova_codex_tick.wav';
  if (!AssetManifest.audio.sfx.includes(codexAsset)) fail('Codex tick asset is missing from AssetManifest.audio.sfx');
  const diskPath = path.join(repoRoot, 'public', codexAsset.replace(/^\//, ''));
  if (!existsSync(diskPath)) {
    fail(`Codex tick asset is missing on disk: ${codexAsset}`);
  } else {
    const duration = wavDurationSeconds(diskPath);
    if (!Number.isFinite(duration)) fail('Codex tick asset should be a readable WAV for duration checks');
    if (Number.isFinite(duration) && duration > 0.09) fail(`Codex tick should be brief, found ${duration.toFixed(3)}s`);
  }
  for (const key of ['codex_open', 'codex_move', 'codex_back']) {
    const variants = SFX_CATALOG[key] || [];
    if (variants.length !== 1 || variants[0] !== codexAsset) fail(`${key} should use only the short Codex tick asset`);
    const mix = SFX_MIX[key] || {};
    if (Number(mix.volume) > 0.18) fail(`${key} mix volume is too loud for Codex browsing`);
  }
  if (Number(SFX_MIX.codex_move?.minIntervalMs || 0) < 110) fail('codex_move minIntervalMs should prevent rapid browsing spam');
  const sceneSource = readFileSync(path.join(repoRoot, 'src/scenes/ThreatCodexScene.js'), 'utf8');
  const loudCalls = [...sceneSource.matchAll(/playSfx\('codex_(?:move|back)'[\s\S]*?volume:\s*([0-9.]+)/g)]
    .map((match) => Number(match[1]))
    .filter((volume) => volume > 0.16);
  if (loudCalls.length) fail(`Codex scene has loud Codex SFX call volume(s): ${loudCalls.join(', ')}`);
}

function assetPath(src) {
  if (!src || String(src).startsWith('data:')) return null;
  const clean = String(src).replace(/^\//, '');
  return path.join(repoRoot, 'public', clean);
}

function checkCatalog() {
  const catalog = getThreatCodexCatalog();
  const required = [
    'enemies',
    'attackPatterns',
    'waveTactics',
    'powerups',
    'sectors',
    'elites',
    'bosses',
    'runThemes',
    'cabinetLogs'
  ];
  const categoryIds = THREAT_CODEX_CATEGORIES.map((category) => category.id);
  for (const id of required) {
    if (!categoryIds.includes(id)) fail(`Threat Codex category list is missing ${id}`);
    if (!Array.isArray(catalog[id]) || catalog[id].length === 0) fail(`Threat Codex catalog is missing ${id}`);
  }

  const expectedMinimums = {
    enemies: 180,
    attackPatterns: 40,
    waveTactics: 35,
    powerups: 20,
    sectors: 10,
    elites: 20,
    bosses: 50,
    runThemes: 18,
    cabinetLogs: 8
  };
  for (const [category, minimum] of Object.entries(expectedMinimums)) {
    const count = catalog[category]?.length || 0;
    if (count < minimum) fail(`${category} has ${count} entries, expected at least ${minimum}`);
  }

  const banned = /mysterious|cosmic entity|harnesses energy|delve|formidable foe|ancient secrets|unleash|data-driven|arcade drama|director weights/i;
  const mechanics = {
    enemies: ['movement', 'fires', 'lane', 'formation', 'clear'],
    attackPatterns: ['tell', 'ms', 'danger', 'move'],
    waveTactics: ['entry timing', 'lane', 'formation', 'pressure'],
    powerups: ['powerup', 'changes', 'read', 'pick'],
    sectors: ['waves', 'boss', 'lives', 'gameplay clue'],
    elites: ['movement', 'fire', 'system', 'cooldown'],
    bosses: ['movement', 'pressure', 'signature', 'lane'],
    runThemes: ['swarm director', 'hidden command intelligence', 'wave shapes', 'sector'],
    cabinetLogs: ['read', 'boss', 'life', 'trait', 'codex', 'near', 'run', 'clear']
  };
  for (const [category, entries] of Object.entries(catalog)) {
    const words = mechanics[category] || [];
    for (const entry of entries || []) {
      const text = textOf(entry);
      const entryMechanics = category === 'enemies' && /boss[-\s]support|boss healer|fuel ship/i.test(`${entry.signalClass || ''} ${entry.role || ''} ${entry.rarity || ''}`)
        ? ['support', 'heal', 'tank', 'boss']
        : words;
      if (banned.test(text)) fail(`generic AI-ish copy remains in ${category}:${entry.id}`);
      if (String(entry.description || '').length < 80) fail(`${category}:${entry.id} description is too short to be useful`);
      if (String(entry.tip || '').length < 30) fail(`${category}:${entry.id} tip is too short to guide play`);
      if (entryMechanics.length && !includesAny(text, entryMechanics)) fail(`${category}:${entry.id} lacks mechanics-relevant words: ${entryMechanics.join(', ')}`);
    }
  }

  for (let index = 0; index < (catalog.sectors || []).length; index += 1) {
    const entry = catalog.sectors[index];
    if (!/lore note|tiny threat flavor|local rumor|field detail/i.test(entry.description || '')) {
      fail(`sector:${entry.id} lacks a tiny lore or threat flavor detail`);
    }
    if (!/gameplay clue/i.test(entry.description || '')) {
      fail(`sector:${entry.id} lacks an explicit gameplay clue`);
    }
    for (let other = index + 1; other < (catalog.sectors || []).length; other += 1) {
      const score = jaccard(entry.description, catalog.sectors[other].description);
      if (score > 0.42) fail(`sector descriptions are too similar: ${entry.id} vs ${catalog.sectors[other].id} (${score.toFixed(2)})`);
    }
  }

  for (const entry of catalog.runThemes || []) {
    const text = textOf(entry);
    if (/_/.test(text) || /\b(?:SCREEN_DOOR|DOUBLE_ARC|CROSS_STREAM|STAGGERED_WING|ORBIT_RING|DIAGONAL_RAID|V_SHAPE|PINCER|GRID|BOX|SPIRAL|ARC)\b/.test(text)) {
      fail(`run theme exposes internal formation token: ${entry.id}`);
    }
    if (!/swarm director/i.test(text) || !/hidden command intelligence/i.test(text)) {
      fail(`run theme does not explain the director in-world: ${entry.id}`);
    }
    if (!/watch sector one/i.test(text) || !/break|clear|wait|dodge|move|shoot|silence|route|step|let|leave|delete|learn|respect|watch|track/i.test(text)) {
      fail(`run theme does not explain what changes and how to adapt: ${entry.id}`);
    }
  }

  checkCodexSfx();

  const assetReport = [];
  const artSources = new Set();
  for (const entries of Object.values(catalog)) {
    for (const entry of entries || []) {
      if (entry?.art) artSources.add(entry.art);
    }
  }
  for (const src of artSources) {
    const dataDims = dataSvgDimensions(src);
    if (dataDims) {
      assetReport.push({ src: 'data:image/svg+xml', ...dataDims });
      continue;
    }
    const file = assetPath(src);
    if (!file || !existsSync(file)) {
      fail(`Codex art missing: ${src}`);
      continue;
    }
    const dims = imageDimensions(file);
    if (!dims) {
      fail(`Could not read Codex art dimensions: ${src}`);
      continue;
    }
    if (dims.width < 32 || dims.height < 32) fail(`Codex art too small: ${src} ${dims.width}x${dims.height}`);
    if (dims.width > 4096 || dims.height > 4096) fail(`Codex art too large: ${src} ${dims.width}x${dims.height}`);
    assetReport.push({ src, ...dims });
  }
  writeFileSync(path.join(outDir, 'codex-asset-dimensions.json'), JSON.stringify(assetReport, null, 2));

  return catalog;
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(Number(value))) return '0';
  return Number(value).toFixed(digits).replace(/\.?0+$/, '');
}

function shipSignature(ship) {
  const s = ship.stats || {};
  const w = ship.weapon || {};
  const h = ship.hitbox || {};
  const c = ship.trait?.effects?.combat || {};
  return [
    s.speed,
    s.fireRate,
    s.damage,
    s.bulletSpeed,
    w.bullets,
    w.spread,
    h.radius,
    c.projectileRadiusMult,
    c.dodgeCooldownMult,
    c.dodgeDurationMult,
    c.bonusShotEvery,
    c.wingShotEvery,
    c.pierceEvery,
    c.critEvery,
    c.dodgePulseRadius,
    c.nearMissScoreMult
  ].join('|');
}

function summarizeTrait(ship) {
  const trait = ship.trait || {};
  const combat = trait.effects?.combat || {};
  const pieces = [];
  if (combat.wingShotEvery) pieces.push(`wing bullets every ${combat.wingShotEvery} shots`);
  if (combat.bonusShotEvery) pieces.push(`bonus shot every ${combat.bonusShotEvery} shots`);
  if (combat.pierceEvery) pieces.push(`pierce every ${combat.pierceEvery} shots`);
  if (combat.critEvery) pieces.push(`critical every ${combat.critEvery} shots`);
  if (combat.dodgePulseRadius) pieces.push(`dodge pulse ${Math.round(combat.dodgePulseRadius)} px`);
  if (Number(combat.nearMissScoreMult || 1) !== 1) pieces.push(`near-miss x${formatNumber(combat.nearMissScoreMult, 1)}`);
  if (Number(combat.projectileRadiusMult || 1) !== 1) pieces.push(`projectile radius x${formatNumber(combat.projectileRadiusMult, 2)}`);
  if (Number(combat.dodgeCooldownMult || 1) !== 1) pieces.push(`dodge cooldown x${formatNumber(combat.dodgeCooldownMult, 2)}`);
  return pieces.join('; ') || 'stat-tuned passive profile';
}

function groupBy(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = groups.get(key) || [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return groups;
}

function writeShipAudit() {
  const ships = buildSelectableShipVariants(ShipData);
  if (ships.length !== 25) fail(`ship trait audit expected 25 selectable ships, found ${ships.length}`);
  const rows = ships.map((ship) => {
    const unlock = getShipUnlockDefinition(ship.id);
    const stats = ship.stats || {};
    const weapon = ship.weapon || {};
    const hitbox = ship.hitbox || {};
    const traitLines = getTraitDetailLines(ship.trait, ship);
    return {
      id: ship.id,
      name: ship.name,
      unlock: unlock?.label || ship.unlock?.label || 'Unknown',
      stats: `spd ${formatNumber(stats.speed)} / fire ${Math.round(stats.fireRate)}ms / dmg ${formatNumber(stats.damage)} / bullet ${formatNumber(stats.bulletSpeed)} / bullets ${weapon.bullets || 1} / spread ${formatNumber(weapon.spread || 0, 3)} / hitbox ${hitbox.radius || '?'}`,
      trait: ship.trait?.label || 'UNKNOWN',
      summary: summarizeTrait(ship),
      details: traitLines.join(' '),
      signature: shipSignature(ship)
    };
  });

  const duplicateSignatures = [...groupBy(rows, (row) => row.signature).entries()]
    .filter(([, group]) => group.length > 1)
    .map(([, group]) => group.map((row) => `${row.id} ${row.name}`).join(', '));
  const sharedTraitLabels = [...groupBy(rows, (row) => row.trait).entries()]
    .filter(([, group]) => group.length > 1)
    .map(([label, group]) => `${label}: ${group.map((row) => `${row.id} ${row.name}`).join(', ')}`);

  const similarityGroups = [
    ['Wing-shot family', rows.filter((row) => /wing bullets/.test(row.summary))],
    ['Bonus-shot family', rows.filter((row) => /bonus shot/.test(row.summary))],
    ['Pierce family', rows.filter((row) => /pierce every/.test(row.summary))],
    ['Critical family', rows.filter((row) => /critical every/.test(row.summary))],
    ['Dodge-pulse family', rows.filter((row) => /dodge pulse/.test(row.summary))],
    ['Near-miss scoring family', rows.filter((row) => /near-miss x1\.[2-9]|near-miss x1\.1/.test(row.summary))]
  ].filter(([, group]) => group.length > 1)
    .map(([label, group]) => `${label}: ${group.map((row) => `${row.id} ${row.name}`).join(', ')}`);

  const markdown = [
    '# Nova Swarm Player Ship Trait Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Read-only audit. No ship stats, traits, unlocks, saves, or balance values were changed.',
    '',
    '## Summary',
    '',
    `- Selectable ships: ${rows.length}`,
    `- Duplicate full gameplay signatures: ${duplicateSignatures.length ? duplicateSignatures.join(' | ') : 'none'}`,
    `- Shared trait labels: ${sharedTraitLabels.length ? sharedTraitLabels.join(' | ') : 'none'}`,
    '',
    '## Ship Table',
    '',
    '| Ship | Unlock | Stats | Trait | Mechanic summary |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row.id} ${row.name} | ${row.unlock} | ${row.stats} | ${row.trait} | ${row.summary} |`),
    '',
    '## Duplicate Or Similar Groups',
    '',
    ...(duplicateSignatures.length ? duplicateSignatures.map((line) => `- Duplicate signature: ${line}`) : ['- Duplicate full gameplay signatures: none.']),
    ...(sharedTraitLabels.length ? sharedTraitLabels.map((line) => `- Shared trait label: ${line}`) : ['- Shared trait labels: none.']),
    ...(similarityGroups.length ? similarityGroups.map((line) => `- ${line}`) : ['- Similar mechanic families: none detected.']),
    '',
    '## Future Design Suggestions',
    '',
    '- Shared labels are fine when the stat line makes the ship feel different, but `ARCADE SAW` appears twice and could eventually get a subtitle on the final ship to reduce hangar ambiguity.',
    '- The roster has strong coverage across wing, bonus, pierce, critical, dodge-pulse, and near-miss families; future ships should combine existing families carefully instead of adding raw damage inflation.',
    '- Keep unlock requirements tied to varied profile milestones, not only score, so Codex discovery and overrun play continue to matter.',
    '',
    '## Trait Details',
    '',
    ...rows.flatMap((row) => [
      `### ${row.id} ${row.name}`,
      '',
      `- Unlock: ${row.unlock}`,
      `- Stats: ${row.stats}`,
      `- Trait: ${row.trait}`,
      `- Details: ${row.details}`,
      ''
    ])
  ].join('\n');

  writeFileSync(path.join(outDir, 'ship-trait-audit.md'), markdown);
  writeFileSync(path.join(outDir, 'ship-trait-audit.json'), JSON.stringify(rows, null, 2));
  if (new Set(rows.map((row) => row.signature)).size < 25) fail('ship trait audit found duplicate full gameplay signatures');
  return rows;
}

mkdirSync(outDir, { recursive: true });
const catalog = checkCatalog();
const ships = writeShipAudit();

if (failures.length) {
  console.error(`[codex-revamp] FAIL ${failures.length} issue(s)`);
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

const total = Object.values(catalog).reduce((sum, entries) => sum + (entries?.length || 0), 0);
console.log(`[codex-revamp] PASS categories=${THREAT_CODEX_CATEGORIES.length} total=${total} ships=${ships.length}`);
console.log(`[codex-revamp] Wrote ${path.relative(repoRoot, path.join(outDir, 'ship-trait-audit.md'))}`);
