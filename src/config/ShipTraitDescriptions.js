function formatEvery(value) {
  const cadence = Math.max(0, Math.floor(Number(value) || 0));
  if (!cadence) return null;
  const suffix = cadence === 1 ? 'st' : cadence === 2 ? 'nd' : cadence === 3 ? 'rd' : 'th';
  return `${cadence}${suffix}`;
}

function percent(value) {
  return `${Math.round(Number(value) * 100)}%`;
}

function pushStatLine(lines, effects = {}) {
  const statNotes = [];
  const fireRate = Number(effects.fireRateMult || 1);
  const damage = Number(effects.damageMult || 1);
  const speed = Number(effects.speedMult || 1);
  const bulletSpeed = Number(effects.bulletSpeedMult || 1);
  const spread = Number(effects.spreadDelta || 0);
  const hitbox = Number(effects.hitboxMult || 1);
  const projectileRadius = Number(effects.combat?.projectileRadiusMult || 1);

  if (fireRate <= 0.95) statNotes.push('faster reload');
  if (fireRate >= 1.05) statNotes.push('slower reload');
  if (damage >= 1.06) statNotes.push('stronger main shots');
  if (damage <= 0.95) statNotes.push('lighter main-shot damage');
  if (speed >= 1.05) statNotes.push('faster ship movement');
  if (speed <= 0.95) statNotes.push('slower ship movement');
  if (bulletSpeed >= 1.08) statNotes.push('faster bullets');
  if (spread >= 0.025) statNotes.push('wider shot spread');
  if (spread <= -0.025) statNotes.push('tighter shot spread');
  if (hitbox <= 0.94) statNotes.push('smaller hitbox for threading bullets');
  if (hitbox >= 1.05) statNotes.push('larger hitbox, so tight dodges are riskier');
  if (projectileRadius >= 1.08) statNotes.push('larger projectiles that are easier to land');
  if (projectileRadius <= 0.94) statNotes.push('smaller projectiles that are more precise');

  if (statNotes.length) {
    lines.push(`Tradeoff: ${statNotes.join(', ')}.`);
  }
}

export function getTraitDetailLines(trait, ship = {}) {
  if (!trait?.label) return ['Balanced arcade handling.'];

  const effects = trait.effects || {};
  const combat = effects.combat || {};
  const lines = [];
  lines.push(trait.description || 'Balanced arcade handling.');

  const wingEvery = formatEvery(combat.wingShotEvery);
  if (wingEvery) {
    lines.push(`Every ${wingEvery} shot fires two extra angled side bullets from your wings.`);
    lines.push(`The wing counter counts shots fired, not seconds; look for small side bullets leaving the ship.`);
    if (combat.wingShotDamageMult) {
      lines.push(`Wing bullets deal ${percent(combat.wingShotDamageMult)} of main-shot damage and can miss if no enemy is in the side lanes.`);
    }
  }

  const bonusEvery = formatEvery(combat.bonusShotEvery);
  if (bonusEvery) {
    lines.push(`Every ${bonusEvery} shot adds an extra bonus shot to the volley.`);
    lines.push('The bonus counter counts shots fired, not seconds.');
    if (combat.bonusShotDamageMult) {
      lines.push(`Bonus shots deal ${percent(combat.bonusShotDamageMult)} of main-shot damage.`);
    }
  }

  const pierceEvery = formatEvery(combat.pierceEvery);
  if (pierceEvery) {
    lines.push(`Every ${pierceEvery} shot pierces through enemies and can hit several targets in a line.`);
    lines.push('The pierce counter counts shots fired, not seconds.');
    if (combat.pierceDamageMult) {
      lines.push(`Piercing shots deal ${percent(combat.pierceDamageMult)} damage per hit.`);
    }
  }

  const critEvery = formatEvery(combat.critEvery);
  if (critEvery) {
    lines.push(`Every ${critEvery} shot becomes a heavier critical shot.`);
    lines.push('The crit counter counts shots fired, not seconds; critical shots hit harder and read as heavier impacts.');
    if (combat.critDamageMult) {
      lines.push(`Critical shots deal ${percent(combat.critDamageMult)} damage.`);
    }
  }

  if (Number(combat.dodgePulseRadius || 0) > 0) {
    lines.push(`Finishing a phase dodge releases one pulse that clears nearby enemy bullets within ${Math.round(combat.dodgePulseRadius)} px.`);
    lines.push('Graze safely during the phase window, then use the exit pulse to open your next lane.');
  }

  if (Number(combat.nearMissScoreMult || 1) > 1.02) {
    lines.push(`Near misses give a x${Number(combat.nearMissScoreMult).toFixed(1)} score multiplier bonus.`);
    lines.push('Near-miss scoring rewards clean close dodges, but it does not protect you from hits.');
  }

  pushStatLine(lines, effects);

  return lines.filter(Boolean);
}

export function getTraitExplanation(trait, ship = {}) {
  const label = trait?.label || 'BALANCED TUNE';
  return {
    label,
    summary: trait?.description || 'Balanced arcade handling.',
    lines: getTraitDetailLines(trait, ship)
  };
}

export function getTraitHudHint(trait, ship = {}) {
  const combat = trait?.effects?.combat || {};
  if (combat.wingShotEvery) return `Wing side bullets every ${combat.wingShotEvery} shots.`;
  if (combat.bonusShotEvery) return `Bonus shot every ${combat.bonusShotEvery} shots.`;
  if (combat.pierceEvery) return `Piercing shot every ${combat.pierceEvery} shots.`;
  if (combat.critEvery) return `Critical shot every ${combat.critEvery} shots.`;
  if (combat.dodgePulseRadius) return 'Phase exit pulse clears nearby bullets.';
  if (Number(combat.nearMissScoreMult || 1) > 1.02) return 'Near misses boost score.';
  return trait?.description || 'Passive trait active.';
}
