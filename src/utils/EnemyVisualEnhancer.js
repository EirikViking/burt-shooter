/**
 * EnemyVisualEnhancer - Adds distinct visual flair to enemy ships
 * Makes enemies look dramatically different and more threatening
 */

import * as PIXI from 'pixi.js';

/**
 * Applies visual enhancements to an enemy sprite based on model/type
 * @param {PIXI.Container} enemyContainer - The enemy's sprite container
 * @param {number} model - The enemy model number (1-3)
 * @param {string} color - The enemy color variant
 * @param {PIXI.Application} app - Pixi app for ticker management
 * @returns {Function} cleanup function to remove effects
 */
export function enhanceEnemyVisuals(enemyContainer, model, color, app) {
  const enhancements = [];
  const cleanupFunctions = [];

  // Get enhancement profile based on model and color
  const profile = getEnemyEnhancementProfile(model, color);

  if (!profile) return () => {}; // No enhancements

  // Apply base tint/color shift
  if (profile.tint && enemyContainer.children[0]) {
    const enemySprite = findEnemySprite(enemyContainer);
    if (enemySprite) {
      const originalTint = enemySprite.tint;
      enemySprite.tint = profile.tint;
      cleanupFunctions.push(() => {
        enemySprite.tint = originalTint;
      });
    }
  }

  // Add menacing glow
  if (profile.glow) {
    const glow = createGlowEffect(profile.glow);
    enemyContainer.addChildAt(glow, 0);
    enhancements.push(glow);
  }

  // Add engine trails
  if (profile.engineTrails) {
    const trails = createEngineTrails(profile.engineTrails);
    trails.forEach(trail => {
      enemyContainer.addChild(trail);
      enhancements.push(trail);
    });
  }

  // Add weapon glow
  if (profile.weaponGlow) {
    const weaponGlow = createWeaponGlow(profile.weaponGlow);
    enemyContainer.addChild(weaponGlow);
    enhancements.push(weaponGlow);
  }

  // Add danger indicators
  if (profile.dangerIndicator) {
    const indicator = createDangerIndicator(profile.dangerIndicator);
    enemyContainer.addChild(indicator);
    enhancements.push(indicator);
  }

  // Add particle emitter
  if (profile.particles) {
    const emitter = createParticleEmitter(profile.particles);
    enemyContainer.addChild(emitter);
    enhancements.push(emitter);
  }

  // Add animated visual effects ticker
  let tickerFunc = null;
  if (enhancements.length > 0) {
    tickerFunc = () => animateEnemyEnhancements(enhancements, profile);
    app.ticker.add(tickerFunc);
    cleanupFunctions.push(() => {
      app.ticker.remove(tickerFunc);
    });
  }

  // Return cleanup function
  return () => {
    enhancements.forEach(e => {
      if (e.parent) e.parent.removeChild(e);
    });
    cleanupFunctions.forEach(fn => fn());
  };
}

function findEnemySprite(container) {
  for (let child of container.children) {
    if (child instanceof PIXI.Sprite && child.texture) {
      return child;
    }
  }
  return null;
}

function getEnemyEnhancementProfile(model, color) {
  const profiles = {
    // Model 1 - Scout ships
    '1_blue': {
      tint: 0x88bbff,
      glow: { color: 0x0066ff, radius: 12, alpha: 0.4, pulse: true },
      engineTrails: { count: 1, color: 0x0088ff, length: 8, width: 2 }
    },
    '1_green': {
      tint: 0xaaffaa,
      glow: { color: 0x00ff00, radius: 12, alpha: 0.35, pulse: true },
      engineTrails: { count: 1, color: 0x00ff00, length: 8, width: 2 },
      particles: { type: 'toxic', color: 0x00ff00, rate: 0.2, size: 2 }
    },
    '1_orange': {
      tint: 0xffbb88,
      glow: { color: 0xff6600, radius: 14, alpha: 0.4, pulse: true },
      engineTrails: { count: 2, color: 0xff6600, length: 10, width: 2 },
      weaponGlow: { color: 0xff3300, size: 4 }
    },
    '1_red': {
      tint: 0xffaaaa,
      glow: { color: 0xff0000, radius: 14, alpha: 0.45, pulse: true },
      engineTrails: { count: 2, color: 0xff0000, length: 10, width: 3 },
      weaponGlow: { color: 0xff0000, size: 5 },
      dangerIndicator: { color: 0xff0000, blink: true }
    },

    // Model 2 - Fighter ships
    '2_blue': {
      tint: 0x6699ff,
      glow: { color: 0x0066ff, radius: 16, alpha: 0.45, pulse: true },
      engineTrails: { count: 2, color: 0x0088ff, length: 12, width: 3 },
      weaponGlow: { color: 0x00ffff, size: 4 }
    },
    '2_green': {
      tint: 0x88ff88,
      glow: { color: 0x00ff00, radius: 16, alpha: 0.4, pulse: true },
      engineTrails: { count: 2, color: 0x00ff00, length: 12, width: 3 },
      particles: { type: 'toxic', color: 0x00ff00, rate: 0.3, size: 2 },
      weaponGlow: { color: 0x00ff00, size: 4 }
    },
    '2_orange': {
      tint: 0xffaa66,
      glow: { color: 0xff8800, radius: 18, alpha: 0.5, pulse: true },
      engineTrails: { count: 3, color: 0xff6600, length: 14, width: 3 },
      weaponGlow: { color: 0xff3300, size: 6 },
      particles: { type: 'fire', color: 0xff6600, rate: 0.3, size: 2 }
    },
    '2_red': {
      tint: 0xff8888,
      glow: { color: 0xff0000, radius: 18, alpha: 0.55, pulse: true },
      engineTrails: { count: 3, color: 0xff0000, length: 14, width: 4 },
      weaponGlow: { color: 0xff0000, size: 6 },
      dangerIndicator: { color: 0xff0000, blink: true },
      particles: { type: 'fire', color: 0xff0000, rate: 0.4, size: 3 }
    },

    // Model 3 - Heavy ships
    '3_blue': {
      tint: 0x4477ff,
      glow: { color: 0x0066ff, radius: 20, alpha: 0.5, pulse: true },
      engineTrails: { count: 3, color: 0x0088ff, length: 16, width: 4 },
      weaponGlow: { color: 0x00ffff, size: 6 },
      dangerIndicator: { color: 0x0088ff, blink: false }
    },
    '3_green': {
      tint: 0x66ff66,
      glow: { color: 0x00ff00, radius: 20, alpha: 0.45, pulse: true },
      engineTrails: { count: 3, color: 0x00ff00, length: 16, width: 4 },
      particles: { type: 'toxic', color: 0x00ff00, rate: 0.4, size: 3 },
      weaponGlow: { color: 0x00ff00, size: 6 },
      dangerIndicator: { color: 0x00ff00, blink: false }
    },
    '3_orange': {
      tint: 0xff8844,
      glow: { color: 0xff6600, radius: 22, alpha: 0.6, pulse: true },
      engineTrails: { count: 4, color: 0xff6600, length: 18, width: 5 },
      weaponGlow: { color: 0xff3300, size: 8 },
      particles: { type: 'fire', color: 0xff6600, rate: 0.5, size: 3 },
      dangerIndicator: { color: 0xff6600, blink: true }
    },
    '3_red': {
      tint: 0xff6666,
      glow: { color: 0xff0000, radius: 24, alpha: 0.65, pulse: true },
      engineTrails: { count: 4, color: 0xff0000, length: 18, width: 6 },
      weaponGlow: { color: 0xff0000, size: 8 },
      dangerIndicator: { color: 0xff0000, blink: true },
      particles: { type: 'fire', color: 0xff0000, rate: 0.6, size: 4 }
    }
  };

  const key = `${model}_${color}`;
  return profiles[key] || null;
}

function createGlowEffect(config) {
  const glow = new PIXI.Graphics();
  glow.name = 'enemyGlow';
  glow.circle(0, 0, config.radius);
  glow.fill({ color: config.color, alpha: config.alpha });
  glow.enhancementConfig = config;
  return glow;
}

function createEngineTrails(config) {
  const trails = [];
  for (let i = 0; i < config.count; i++) {
    const trail = new PIXI.Graphics();
    trail.name = 'engineTrail';
    const yOffset = config.count === 1 ? 0 : (i - (config.count - 1) / 2) * 5;
    trail.position.set(0, yOffset + 12); // Behind enemy
    trail.enhancementConfig = config;
    trails.push(trail);
  }
  return trails;
}

function createWeaponGlow(config) {
  const weaponGlow = new PIXI.Graphics();
  weaponGlow.name = 'weaponGlow';
  weaponGlow.position.set(0, -10); // Front of enemy
  weaponGlow.enhancementConfig = config;
  return weaponGlow;
}

function createDangerIndicator(config) {
  const indicator = new PIXI.Graphics();
  indicator.name = 'dangerIndicator';
  indicator.position.set(0, -18); // Above enemy
  indicator.enhancementConfig = config;
  return indicator;
}

function createParticleEmitter(config) {
  const emitter = new PIXI.Container();
  emitter.name = 'particleEmitter';
  emitter.particles = [];
  emitter.enhancementConfig = config;
  emitter.spawnTimer = 0;
  return emitter;
}

function animateEnemyEnhancements(enhancements, profile) {
  const now = Date.now();

  enhancements.forEach(enhancement => {
    const config = enhancement.enhancementConfig;
    if (!config) return;

    if (enhancement.name === 'enemyGlow') {
      if (config.pulse) {
        const pulse = Math.sin(now * 0.004) * 0.5 + 0.5;
        enhancement.alpha = config.alpha * (0.6 + pulse * 0.4);
        enhancement.scale.set(1 + pulse * 0.08);
      }
    }

    if (enhancement.name === 'engineTrail') {
      enhancement.clear();
      const pulse = Math.sin(now * 0.005 + enhancement.y * 0.1) * 0.5 + 0.5;
      const length = config.length;

      enhancement.moveTo(0, 0);
      enhancement.lineTo(0, length);
      enhancement.stroke({ color: config.color, width: config.width, alpha: pulse * 0.7 });
    }

    if (enhancement.name === 'weaponGlow') {
      enhancement.clear();
      const pulse = Math.sin(now * 0.006) * 0.5 + 0.5;
      enhancement.circle(0, 0, config.size);
      enhancement.fill({ color: config.color, alpha: (0.5 + pulse * 0.5) });
    }

    if (enhancement.name === 'dangerIndicator') {
      enhancement.clear();
      if (config.blink) {
        const blink = Math.floor(now / 200) % 2;
        if (blink) {
          enhancement.moveTo(-6, 0);
          enhancement.lineTo(6, 0);
          enhancement.moveTo(0, -6);
          enhancement.lineTo(0, 6);
          enhancement.stroke({ color: config.color, width: 2, alpha: 0.8 });
        }
      } else {
        enhancement.moveTo(-4, 0);
        enhancement.lineTo(4, 0);
        enhancement.moveTo(0, -4);
        enhancement.lineTo(0, 4);
        enhancement.stroke({ color: config.color, width: 1, alpha: 0.6 });
      }
    }

    if (enhancement.name === 'particleEmitter') {
      // Spawn particles
      enhancement.spawnTimer += 0.016;
      if (enhancement.spawnTimer > (1 / config.rate)) {
        enhancement.spawnTimer = 0;
        spawnEnemyParticle(enhancement, config);
      }

      // Update particles
      updateEnemyParticles(enhancement);
    }
  });
}

function spawnEnemyParticle(emitter, config) {
  const particle = new PIXI.Graphics();
  particle.circle(0, 0, config.size);
  particle.fill({ color: config.color, alpha: 0.7 });

  // Position at enemy location
  particle.x = (Math.random() - 0.5) * 6;
  particle.y = 8; // Behind enemy

  // Velocity based on type
  if (config.type === 'toxic') {
    particle.vx = (Math.random() - 0.5) * 0.3;
    particle.vy = 0.4 + Math.random() * 0.3;
  } else if (config.type === 'fire') {
    particle.vx = (Math.random() - 0.5) * 0.4;
    particle.vy = 0.5 + Math.random() * 0.4;
  }

  particle.life = 1.0;
  emitter.addChild(particle);
  emitter.particles.push(particle);
}

function updateEnemyParticles(emitter) {
  emitter.particles.forEach((particle, idx) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 0.03;
    particle.alpha = Math.max(0, particle.life * 0.7);

    if (particle.life <= 0) {
      emitter.removeChild(particle);
      emitter.particles[idx] = null;
    }
  });

  // Clean up dead particles
  emitter.particles = emitter.particles.filter(p => p !== null);
}
