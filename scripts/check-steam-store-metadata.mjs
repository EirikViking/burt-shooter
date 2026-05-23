import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const metadataPath = path.resolve(root, 'release/steamworks/store_metadata_draft.json');
const reportPath = path.resolve(root, 'release/steamworks/store_metadata_review_report.json');

const errors = [];
const warnings = [];
const preferredTags = new Set([
  'Arcade',
  "Shoot 'Em Up",
  'Score Attack',
  'Retro',
  'Space',
  '2D',
  'Controller',
  'Singleplayer',
  'Bullet Hell',
  'Action',
  'Indie'
]);
const dilutedTags = new Set([
  'Casual',
  'Colorful',
  'Family Friendly',
  'Old School',
  'Sci-fi',
  'Story Rich',
  'Narration',
  'Roguelike',
  'Roguelite',
  'Procedural Generation',
  'Twin Stick Shooter',
  'Arena Shooter',
  'Psychedelic',
  'Third Person',
  'Simulation'
]);
const forbiddenMarketingTerms = [
  /\bAI\b/i,
  /\bgenerated\b/i,
  /\bGalaga\b/i,
  /\bSpace Invaders\b/i,
  /\bSteam leaderboards?\b/i,
  /Separate local and online leaderboards/i
];

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function requireString(object, key, minLength = 1, maxLength = Infinity) {
  const value = object?.[key];
  if (typeof value !== 'string' || value.trim().length < minLength) {
    errors.push(`${key} is missing or too short`);
    return '';
  }
  if (value.length > maxLength) {
    errors.push(`${key} is too long (${value.length}/${maxLength})`);
  }
  return value;
}

function requireArray(object, key, minLength = 1) {
  const value = object?.[key];
  if (!Array.isArray(value) || value.length < minLength) {
    errors.push(`${key} must contain at least ${minLength} item(s)`);
    return [];
  }
  return value;
}

function hasPath(relativePath) {
  return existsSync(path.resolve(root, relativePath));
}

if (!existsSync(metadataPath)) {
  errors.push(`Missing ${path.relative(root, metadataPath)}`);
}

const metadata = errors.length ? {} : readJson(metadataPath);

if (!errors.length) {
  requireString(metadata, 'title', 3, 80);
  const shortDescription = requireString(metadata, 'shortDescription', 30, 300);
  const longDescription = requireArray(metadata, 'longDescription', 2);
  if (longDescription.join('\n').length < 240) {
    errors.push('longDescription is too short for a useful Steam page draft');
  }
  requireArray(metadata, 'featureBullets', 5);
  requireArray(metadata, 'tags', 10);
  requireArray(metadata, 'categories', 1);
  requireArray(metadata, 'supportedPlatforms', 1);
  requireArray(metadata, 'approvalRequired', 3);

  if (!/fast modern arcade score-chaser/i.test(shortDescription) &&
      !longDescription.some((paragraph) => /fast modern arcade score-chaser/i.test(String(paragraph)))) {
    errors.push('store copy must lead with "fast modern arcade score-chaser" positioning');
  }

  const marketingText = [
    metadata.shortDescription,
    ...(metadata.longDescription || []),
    ...(metadata.featureBullets || [])
  ].join('\n');
  for (const pattern of forbiddenMarketingTerms) {
    if (pattern.test(marketingText)) {
      errors.push(`store-facing copy contains forbidden marketing term: ${pattern}`);
    }
  }

  const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
  const diluted = tags.filter((tag) => dilutedTags.has(tag));
  const unsupported = tags.filter((tag) => !preferredTags.has(tag));
  if (tags.length > 11) {
    errors.push(`tags are too broad (${tags.length}/11); keep Steam identity focused`);
  }
  if (diluted.length) {
    errors.push(`tags dilute the arcade score-chaser identity: ${diluted.join(', ')}`);
  }
  if (unsupported.length) {
    errors.push(`tags outside the anti-flop approved set: ${unsupported.join(', ')}`);
  }

  if (metadata.status !== 'draft_pending_human_approval') {
    warnings.push('metadata status should remain draft_pending_human_approval until human approval is recorded');
  }
  if (metadata.categories?.includes('Full Controller Support')) {
    errors.push('Do not claim Full Controller Support until Steam client text entry/controller metadata are validated');
  }
  if (!metadata.categories?.includes('Partial Controller Support')) {
    errors.push('Steam store categories must keep Partial Controller Support until full menu/settings/highscore navigation, text-entry behavior, controller glyphs, and Steam Input metadata are validated');
  }
  if (metadata.controllerSupportDecision?.steamworksCategory !== 'Partial Controller Support') {
    errors.push('controllerSupportDecision.steamworksCategory must remain Partial Controller Support until Full Controller Support is validated');
  }
  if (metadata.achievementsDecision?.status !== 'defer_for_v1') {
    warnings.push('Achievements decision differs from current no-Steamworks-API implementation');
  }
  if (metadata.steamCloudDecision?.status !== 'defer_for_v1') {
    warnings.push('Steam Cloud decision differs from current local-only desktop storage');
  }

  const launch = metadata.launchOptions?.[0];
  if (!launch || launch.executable !== 'Nova Swarm.exe') {
    errors.push('launchOptions[0].executable must be Nova Swarm.exe');
  }

  const min = metadata.systemRequirements?.minimum || {};
  for (const key of ['os', 'processor', 'memory', 'graphics', 'storage']) {
    if (!min[key]) errors.push(`minimum systemRequirements.${key} is missing`);
  }
  if (min.storage && !/1\s*GB/i.test(min.storage)) {
    errors.push('minimum systemRequirements.storage must be at least 1 GB to match the current packaged payload');
  }
  const rec = metadata.systemRequirements?.recommended || {};
  if (rec.storage && !/1\s*GB/i.test(rec.storage)) {
    errors.push('recommended systemRequirements.storage must be at least 1 GB to match the current packaged payload');
  }

  const assets = metadata.uploadAssets || {};
  for (const key of ['screenshots', 'capsules', 'trailerDraft', 'trailerCandidate']) {
    if (!assets[key]) {
      errors.push(`uploadAssets.${key} is missing`);
    }
  }
  for (const [key, relativePath] of Object.entries(assets)) {
    if (!hasPath(relativePath)) {
      errors.push(`uploadAssets.${key} path is missing: ${relativePath}`);
    }
  }

  if (assets.trailerCandidate && assets.trailerDraft && assets.trailerCandidate === assets.trailerDraft) {
    errors.push('uploadAssets.trailerCandidate must point at the rendered editorial candidate, not the raw draft folder');
  }
  if (assets.trailerCandidate && !String(assets.trailerCandidate).includes('candidate-')) {
    errors.push('uploadAssets.trailerCandidate should point at a candidate-* folder');
  }
  if (assets.screenshots && String(assets.screenshots).includes('2026-05-17')) {
    errors.push('uploadAssets.screenshots still points at the stale 2026-05-17 screenshot set');
  }
  if (assets.screenshots && !String(assets.screenshots).includes('2026-05-23-action')) {
    errors.push('uploadAssets.screenshots should point at the current action-heavy 2026-05-23 screenshot set');
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  metadataPath: path.relative(root, metadataPath).replaceAll(path.sep, '/'),
  status: errors.length ? 'failed' : 'passed',
  errors,
  warnings,
  summary: {
    tags: Array.isArray(metadata.tags) ? metadata.tags.length : 0,
    categories: Array.isArray(metadata.categories) ? metadata.categories.length : 0,
    featureBullets: Array.isArray(metadata.featureBullets) ? metadata.featureBullets.length : 0,
    controllerSupport: metadata.controllerSupportDecision?.steamworksCategory || null,
    achievements: metadata.achievementsDecision?.status || null,
    steamCloud: metadata.steamCloudDecision?.status || null
  }
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (errors.length) {
  console.error('[steam-store-metadata] failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`[steam-store-metadata] ok: ${report.summary.tags} tags, ${report.summary.featureBullets} bullets, ${report.summary.controllerSupport}`);
if (warnings.length) {
  console.warn(`[steam-store-metadata] warnings: ${warnings.length}`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}
