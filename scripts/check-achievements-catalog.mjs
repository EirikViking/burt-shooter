import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  ACHIEVEMENTS,
  LEGEND_ACHIEVEMENTS,
  LEGEND_SCORE_GATE,
  SWARM_ELITE_SCORE_GATE
} from '../src/achievements/AchievementCatalog.js';
import { ShipUnlockConfig } from '../src/config/ShipUnlockConfig.js';

const errors = [];

function fail(message) {
  errors.push(message);
}

const ids = ACHIEVEMENTS.map((achievement) => achievement.id);
const names = ACHIEVEMENTS.map((achievement) => achievement.name);
const idPattern = /^ACH_[A-Z0-9]+(?:_[A-Z0-9]+)*$/;
const expectedTotal = 81;
const expectedMilestones = 40;
const expectedLegendMilestones = 30;
const allowedMilestoneDifficulties = new Set(['medium', 'hard', 'very_hard', 'legendary']);

if (ACHIEVEMENTS.length > 100) {
  fail(`Catalog has ${ACHIEVEMENTS.length} achievements; Steam limit is 100.`);
}

if (ACHIEVEMENTS.length !== expectedTotal) {
  fail(`Catalog should contain ${expectedTotal} achievements for the Steam launch set; saw ${ACHIEVEMENTS.length}.`);
}

for (const achievement of ACHIEVEMENTS) {
  if (!achievement?.id || !idPattern.test(achievement.id)) {
    fail(`Invalid achievement id: ${achievement?.id || '<blank>'}`);
  }
  if (!achievement?.name || typeof achievement.name !== 'string') {
    fail(`Achievement ${achievement?.id || '<unknown>'} is missing a name.`);
  }
  if (!achievement?.description || typeof achievement.description !== 'string') {
    fail(`Achievement ${achievement?.id || '<unknown>'} is missing a description.`);
  }
  if (achievement.type === 'milestone') {
    if (!achievement.metric || typeof achievement.metric !== 'string') {
      fail(`Milestone achievement ${achievement.id} is missing a metric.`);
    }
    const allowsZeroTarget = Array.isArray(achievement.requirements)
      && achievement.requirements.some((requirement) => requirement.comparator === '<=');
    if (!Number.isFinite(Number(achievement.target)) || Number(achievement.target) < 0 || (Number(achievement.target) === 0 && !allowsZeroTarget)) {
      fail(`Milestone achievement ${achievement.id} needs a positive numeric target.`);
    }
    if (!allowedMilestoneDifficulties.has(achievement.difficulty)) {
      fail(`Milestone achievement ${achievement.id} has unsupported difficulty ${achievement.difficulty}.`);
    }
    if (achievement.difficulty === 'legendary') {
      if (Number(achievement.minimumScore) < LEGEND_SCORE_GATE) {
        fail(`Legend achievement ${achievement.id} must require at least ${LEGEND_SCORE_GATE} score.`);
      }
      if (!Array.isArray(achievement.requirements) || achievement.requirements.length === 0) {
        fail(`Legend achievement ${achievement.id} needs explicit requirements.`);
      }
    }
  }
}

for (const id of ids) {
  if (ids.indexOf(id) !== ids.lastIndexOf(id)) {
    fail(`Duplicate achievement id: ${id}`);
  }
}

for (const name of names) {
  if (names.indexOf(name) !== names.lastIndexOf(name)) {
    fail(`Duplicate achievement name: ${name}`);
  }
}

if (!ids.includes('ACH_GLOBAL_LEADERBOARD')) {
  fail('Missing ACH_GLOBAL_LEADERBOARD.');
}

if (!ids.includes('ACH_GLOBAL_NUMBER_ONE')) {
  fail('Missing ACH_GLOBAL_NUMBER_ONE.');
}

const swarmElite = ACHIEVEMENTS.find((achievement) => achievement.id === 'ACH_GLOBAL_NUMBER_ONE');
if (!swarmElite) {
  fail('Missing stable-ID Swarm Elite achievement.');
} else {
  if (swarmElite.name !== 'Swarm Elite') {
    fail(`ACH_GLOBAL_NUMBER_ONE display name should be "Swarm Elite"; saw "${swarmElite.name}".`);
  }
  if (swarmElite.description !== 'Submit a 750,000-point ranked run.') {
    fail(`Swarm Elite description drifted: "${swarmElite.description}".`);
  }
  if (Number(swarmElite.target) !== SWARM_ELITE_SCORE_GATE || SWARM_ELITE_SCORE_GATE !== 750000) {
    fail(`Swarm Elite score gate must be exactly 750000; saw ${swarmElite.target}.`);
  }
}

const earlyPilot = ACHIEVEMENTS.find((achievement) => achievement.id === 'ACH_EARLY_PILOT');
if (!earlyPilot) {
  fail('Missing ACH_EARLY_PILOT.');
} else {
  if (earlyPilot.name !== 'First Ranked Run') {
    fail(`ACH_EARLY_PILOT display name should stay "First Ranked Run"; saw "${earlyPilot.name}".`);
  }
  if (earlyPilot.description !== 'Finish any ranked run. Practice and Sector Start runs do not count.') {
    fail(`ACH_EARLY_PILOT description drifted: "${earlyPilot.description}".`);
  }
}

const fullHangarOmega = ACHIEVEMENTS.find((achievement) => achievement.id === 'ACH_FULL_HANGAR_OMEGA');
if (!fullHangarOmega) {
  fail('Missing ACH_FULL_HANGAR_OMEGA.');
} else {
  if (Number(fullHangarOmega.target) !== ShipUnlockConfig.length) {
    fail(`Full Hangar Omega must require all ${ShipUnlockConfig.length} playable ships; saw ${fullHangarOmega.target}.`);
  }
  if (!fullHangarOmega.description.includes(`all ${ShipUnlockConfig.length} playable ships`)) {
    fail(`Full Hangar Omega description must name the current ${ShipUnlockConfig.length}-ship catalog.`);
  }
}

const rankNumbers = ids
  .map((id) => /^ACH_RANK_(\d{2})$/.exec(id))
  .filter(Boolean)
  .map((match) => Number(match[1]))
  .sort((a, b) => a - b);

rankNumbers.forEach((rankNumber, index) => {
  const expected = index + 1;
  if (rankNumber !== expected) {
    fail(`Rank achievement ids must be sequential. Expected ACH_RANK_${String(expected).padStart(2, '0')}, saw ACH_RANK_${String(rankNumber).padStart(2, '0')}.`);
  }
});

const milestoneCount = ACHIEVEMENTS.filter((achievement) => achievement.type === 'milestone').length;
if (milestoneCount !== expectedMilestones) {
  fail(`Expected ${expectedMilestones} milestone achievements; saw ${milestoneCount}.`);
}

if (LEGEND_ACHIEVEMENTS.length !== expectedLegendMilestones) {
  fail(`Expected ${expectedLegendMilestones} legend achievements; saw ${LEGEND_ACHIEVEMENTS.length}.`);
}

const manifestPath = path.resolve('release/steamworks/achievement-icons/manifest.json');
if (!fs.existsSync(manifestPath)) {
  fail('Missing Steam achievement icon manifest.');
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const manifestIds = new Set((manifest.icons || []).map((entry) => entry.apiName));
  const releaseIconDir = path.resolve('release/steamworks/achievement-icons');
  const publicIconDir = path.resolve('public/art/generated/nova-swarm/achievements');
  const iconHashes = {
    achievedIcon: new Map(),
    lockedIcon: new Map()
  };
  for (const id of ids) {
    if (!manifestIds.has(id)) {
      fail(`Icon manifest missing ${id}.`);
      continue;
    }
    const entry = (manifest.icons || []).find((item) => item.apiName === id);
    const rankMatch = /^ACH_RANK_(\d{2})$/.exec(id);
    if (rankMatch) {
      const expectedDisplayRank = Number(rankMatch[1]) + 1;
      const expectedBadgeDate = expectedDisplayRank === 40 ? '20260724' : '20260612';
      const expectedSourceBadge = `nova-rank-badge-${String(expectedDisplayRank).padStart(2, '0')}-${expectedBadgeDate}.png`;
      if (Number(entry?.displayRankNumber) !== expectedDisplayRank) {
        fail(`Icon manifest ${id} must display player-facing Rank ${expectedDisplayRank}; saw ${entry?.displayRankNumber ?? '<missing>'}.`);
      }
      if (entry?.sourceRankBadge !== expectedSourceBadge) {
        fail(`Icon manifest ${id} must use ${expectedSourceBadge}; saw ${entry?.sourceRankBadge || '<missing>'}.`);
      }
    }
    for (const key of ['achievedIcon', 'lockedIcon']) {
      const file = entry?.[key];
      const iconPath = file ? path.resolve(releaseIconDir, file) : null;
      if (!file || !fs.existsSync(iconPath)) {
        fail(`Icon manifest ${id} missing file for ${key}.`);
        continue;
      }
      if (!fs.existsSync(path.resolve(publicIconDir, file))) {
        fail(`Runtime achievement icon missing public file ${file}.`);
      } else {
        const publicHash = crypto.createHash('sha256').update(fs.readFileSync(path.resolve(publicIconDir, file))).digest('hex');
        const releaseHash = crypto.createHash('sha256').update(fs.readFileSync(iconPath)).digest('hex');
        if (publicHash !== releaseHash) {
          fail(`Runtime and Steam achievement icons differ for ${file}.`);
        }
      }
      const hash = crypto.createHash('sha256').update(fs.readFileSync(iconPath)).digest('hex');
      const matches = iconHashes[key].get(hash) || [];
      matches.push(file);
      iconHashes[key].set(hash, matches);
    }
  }
  for (const [key, hashes] of Object.entries(iconHashes)) {
    for (const duplicates of hashes.values()) {
      if (duplicates.length > 1) {
        fail(`${key} files must not be byte-identical: ${duplicates.join(', ')}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('[check-achievements-catalog] FAIL');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`[check-achievements-catalog] PASS ${ACHIEVEMENTS.length} achievements (${rankNumbers.length} rank, ${milestoneCount} milestone, ${ACHIEVEMENTS.length - rankNumbers.length - milestoneCount} leaderboard).`);
}
