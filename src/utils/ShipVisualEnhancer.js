/**
 * ShipVisualEnhancer - Adds distinct visual flair to ship sprites
 * Makes ships look dramatically different without requiring new texture files
 */

import * as PIXI from 'pixi.js';

/**
 * Applies visual enhancements to a ship sprite based on ship ID
 * @param {PIXI.Container} shipContainer - The ship's sprite container
 * @param {string} shipId - The ship's ID (e.g., 'rank_ship_0')
 * @param {PIXI.Application} app - Pixi app for ticker management
 * @returns {Function} cleanup function to remove effects
 */
export function enhanceShipVisuals(shipContainer, shipId, app) {
  const enhancements = [];
  const cleanupFunctions = [];

  // Get ship-specific enhancement profile
  const profile = getEnhancementProfile(shipId);

  if (!profile) return () => {}; // No enhancements for this ship

  // Apply base tint/color shift
  if (profile.tint && shipContainer.children[0]) {
    const shipSprite = findShipSprite(shipContainer);
    if (shipSprite) {
      // Store original tint to restore later
      const originalTint = shipSprite.tint;
      shipSprite.tint = profile.tint;
      cleanupFunctions.push(() => {
        shipSprite.tint = originalTint;
      });
    }
  }

  // Add engine trails
  if (profile.engineTrails) {
    const trails = createEngineTrails(profile.engineTrails);
    trails.forEach(trail => {
      shipContainer.addChild(trail);
      enhancements.push(trail);
    });
  }

  // Add glow effects
  if (profile.glow) {
    const glow = createGlowEffect(profile.glow);
    shipContainer.addChildAt(glow, 0); // Behind ship sprite
    enhancements.push(glow);
  }

  // Add shield dome
  if (profile.shieldDome) {
    const shield = createShieldDome(profile.shieldDome);
    shipContainer.addChild(shield);
    enhancements.push(shield);
  }

  // Add wing lights
  if (profile.wingLights) {
    const lights = createWingLights(profile.wingLights);
    lights.forEach(light => {
      shipContainer.addChild(light);
      enhancements.push(light);
    });
  }

  // Add particle emitter
  if (profile.particles) {
    const emitter = createParticleEmitter(profile.particles, shipContainer);
    enhancements.push(emitter);
  }

  // Add animated visual effects ticker
  let tickerFunc = null;
  if (enhancements.length > 0) {
    tickerFunc = () => animateEnhancements(enhancements, profile);
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

function findShipSprite(container) {
  // Find the actual ship sprite (usually the first Sprite child)
  for (let child of container.children) {
    if (child instanceof PIXI.Sprite && child.texture) {
      return child;
    }
  }
  return null;
}

function getEnhancementProfile(shipId) {
  const profiles = {
    rank_ship_0: {
      // Harbor Cruiser - Steady blue glow, classic look
      tint: 0xccddff,
      glow: { color: 0x0066ff, radius: 18, alpha: 0.3, pulse: true },
      engineTrails: { count: 1, color: 0x4488ff, length: 12, width: 3 }
    },
    rank_ship_1: {
      // Isbjorn Classic - Polar bear themed, icy effects
      tint: 0xeeffff,
      glow: { color: 0x00ffff, radius: 20, alpha: 0.4, pulse: true },
      wingLights: { color: 0x00ffff, count: 2, size: 3, blink: true },
      engineTrails: { count: 2, color: 0x00ccff, length: 10, width: 2 }
    },
    rank_ship_2: {
      // Tufsingen - Party mode! Rainbow trails and sparkles
      tint: 0xffddff,
      glow: { color: 0xff00ff, radius: 22, alpha: 0.5, pulse: true, rainbow: true },
      particles: { type: 'sparkle', color: 0xff00ff, rate: 0.3, size: 2 },
      engineTrails: { count: 3, color: 0xff00ff, length: 16, width: 4, rainbow: true }
    },
    rank_ship_3: {
      // Deili Fetta - Greasy orange glow, heavy exhaust
      tint: 0xffddaa,
      glow: { color: 0xff8800, radius: 24, alpha: 0.4, pulse: false },
      engineTrails: { count: 2, color: 0xff6600, length: 20, width: 5, smoke: true },
      particles: { type: 'smoke', color: 0x444444, rate: 0.4, size: 4 }
    },
    rank_ship_4: {
      // Roland Turbo - High-tech cyan accents, precision targeting
      tint: 0xddffff,
      glow: { color: 0x00ffcc, radius: 16, alpha: 0.35, pulse: true },
      wingLights: { color: 0x00ffcc, count: 4, size: 2, blink: false },
      shieldDome: { color: 0x00ffcc, alpha: 0.15, radius: 28 }
    },
    rank_ship_5: {
      // Giga Gris - Massive red glow, intimidating presence
      tint: 0xffcccc,
      glow: { color: 0xff0000, radius: 28, alpha: 0.5, pulse: true },
      engineTrails: { count: 3, color: 0xff3300, length: 18, width: 6 },
      particles: { type: 'fire', color: 0xff3300, rate: 0.5, size: 3 }
    },
    rank_ship_6: {
      // Melbu Express - Speed trails, motion blur effect
      tint: 0xffffcc,
      glow: { color: 0xffff00, radius: 20, alpha: 0.4, pulse: true },
      engineTrails: { count: 4, color: 0xffff00, length: 24, width: 2, speed: true },
      particles: { type: 'speed', color: 0xffff00, rate: 0.6, size: 2 }
    },
    rank_ship_7: {
      // Kjøttdeig Special - Meat-themed brown/red glow, steady trails
      tint: 0xffddcc,
      glow: { color: 0xaa4400, radius: 18, alpha: 0.35, pulse: false },
      engineTrails: { count: 2, color: 0xaa4400, length: 14, width: 4 }
    },
    rank_ship_8: {
      // Burt Prototype - Classic green glow, legendary aura
      tint: 0xeeffee,
      glow: { color: 0x00ff00, radius: 22, alpha: 0.4, pulse: true },
      shieldDome: { color: 0x00ff00, alpha: 0.12, radius: 30 },
      wingLights: { color: 0x00ff00, count: 2, size: 3, blink: true },
      engineTrails: { count: 2, color: 0x00ff00, length: 15, width: 3 }
    }
  };

  return profiles[shipId] || null;
}

function createGlowEffect(config) {
  const glow = new PIXI.Graphics();
  glow.name = 'shipGlow';
  glow.circle(0, 0, config.radius);
  glow.fill({ color: config.color, alpha: config.alpha });
  glow.enhancementConfig = config; // Store config for animation
  return glow;
}

function createEngineTrails(config) {
  const trails = [];
  for (let i = 0; i < config.count; i++) {
    const trail = new PIXI.Graphics();
    trail.name = 'engineTrail';
    const yOffset = config.count === 1 ? 0 : (i - (config.count - 1) / 2) * 6;
    trail.position.set(0, yOffset + 15); // Behind ship
    trail.enhancementConfig = config;
    trails.push(trail);
  }
  return trails;
}

function createShieldDome(config) {
  const shield = new PIXI.Graphics();
  shield.name = 'shieldDome';
  shield.circle(0, 0, config.radius);
  shield.stroke({ color: config.color, width: 2, alpha: config.alpha });
  shield.fill({ color: config.color, alpha: config.alpha * 0.3 });
  shield.enhancementConfig = config;
  return shield;
}

function createWingLights(config) {
  const lights = [];
  for (let i = 0; i < config.count; i++) {
    const light = new PIXI.Graphics();
    light.name = 'wingLight';
    const side = i % 2 === 0 ? -1 : 1;
    const xOffset = side * (10 + Math.floor(i / 2) * 4);
    light.position.set(xOffset, 5);
    light.circle(0, 0, config.size);
    light.fill({ color: config.color, alpha: 0.9 });
    light.enhancementConfig = config;
    lights.push(light);
  }
  return lights;
}

function createParticleEmitter(config, shipContainer) {
  // Particle emitter uses a container
  const emitter = new PIXI.Container();
  emitter.name = 'particleEmitter';
  emitter.particles = [];
  emitter.enhancementConfig = config;
  emitter.spawnTimer = 0;
  return emitter;
}

function animateEnhancements(enhancements, profile) {
  const now = Date.now();

  enhancements.forEach(enhancement => {
    const config = enhancement.enhancementConfig;
    if (!config) return;

    if (enhancement.name === 'shipGlow') {
      if (config.pulse) {
        const pulse = Math.sin(now * 0.003) * 0.5 + 0.5;
        enhancement.alpha = config.alpha * (0.7 + pulse * 0.3);
        enhancement.scale.set(1 + pulse * 0.05);
      }
      if (config.rainbow) {
        const hue = (now * 0.1) % 360;
        const rgb = hslToRgb(hue / 360, 1, 0.5);
        enhancement.clear();
        enhancement.circle(0, 0, config.radius);
        enhancement.fill({ color: rgb, alpha: enhancement.alpha });
      }
    }

    if (enhancement.name === 'engineTrail') {
      enhancement.clear();
      const pulse = config.smoke ? Math.sin(now * 0.004 + enhancement.y * 0.1) * 0.5 + 0.5 : 0.8;
      const length = config.length + (config.speed ? Math.sin(now * 0.01) * 4 : 0);

      let color = config.color;
      if (config.rainbow) {
        const hue = ((now * 0.1) + enhancement.y * 10) % 360;
        color = hslToRgb(hue / 360, 1, 0.5);
      }

      enhancement.moveTo(0, 0);
      enhancement.lineTo(0, length);
      enhancement.stroke({ color, width: config.width, alpha: pulse * 0.6 });
    }

    if (enhancement.name === 'shieldDome') {
      const pulse = Math.sin(now * 0.005) * 0.5 + 0.5;
      enhancement.alpha = config.alpha * (0.6 + pulse * 0.4);
      enhancement.rotation += 0.01;
    }

    if (enhancement.name === 'wingLight' && config.blink) {
      const blink = Math.floor(now / 300) % 2;
      enhancement.alpha = blink ? 0.9 : 0.3;
    }

    if (enhancement.name === 'particleEmitter') {
      // Spawn particles
      enhancement.spawnTimer += 0.016; // ~60fps
      if (enhancement.spawnTimer > (1 / config.rate)) {
        enhancement.spawnTimer = 0;
        spawnParticle(enhancement, config);
      }

      // Update particles
      updateParticles(enhancement);
    }
  });
}

function spawnParticle(emitter, config) {
  const particle = new PIXI.Graphics();
  particle.circle(0, 0, config.size);
  particle.fill({ color: config.color, alpha: 0.8 });

  // Position at ship location
  particle.x = (Math.random() - 0.5) * 8;
  particle.y = 12; // Behind ship

  // Velocity based on type
  if (config.type === 'sparkle') {
    particle.vx = (Math.random() - 0.5) * 0.5;
    particle.vy = 0.5 + Math.random() * 0.5;
  } else if (config.type === 'smoke') {
    particle.vx = (Math.random() - 0.5) * 0.3;
    particle.vy = 0.8 + Math.random() * 0.4;
  } else if (config.type === 'fire') {
    particle.vx = (Math.random() - 0.5) * 0.4;
    particle.vy = 0.6 + Math.random() * 0.6;
  } else if (config.type === 'speed') {
    particle.vx = (Math.random() - 0.5) * 1.0;
    particle.vy = 1.5 + Math.random() * 1.0;
  }

  particle.life = 1.0;
  emitter.addChild(particle);
  emitter.particles.push(particle);
}

function updateParticles(emitter) {
  emitter.particles.forEach((particle, idx) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 0.02;
    particle.alpha = Math.max(0, particle.life);

    if (particle.life <= 0) {
      emitter.removeChild(particle);
      emitter.particles[idx] = null;
    }
  });

  // Clean up dead particles
  emitter.particles = emitter.particles.filter(p => p !== null);
}

function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}
