const CPU_RIVAL_CALLSIGNS = Object.freeze([
  'Neon Rook', 'Vanta Fox', 'Orbit Moth', 'Ion Warden', 'Solar Finch',
  'Kestrel Nine', 'Nova Kite', 'Echo Viper', 'Blue Comet', 'Iron Lark',
  'Rift Walker', 'Pixel Rogue', 'Astra Wolf', 'Cosmic Ray', 'Zero Signal',
  'Night Vector', 'Amber Wing', 'Static Bloom', 'Lunar Jackal', 'Void Runner',
  'Arc Pilot', 'Chrome Wasp', 'Meteor Jane', 'Delta Raven', 'Pulse Rider',
  'Crimson Io', 'Ghost Circuit', 'Prism Hawk', 'Turbo Luna', 'Cinder Ace',
  'Star Nomad', 'Quantum Cat', 'Rocket Mantis', 'Glitch Baron', 'Halo Drift',
  'Copper Nova', 'Vector Kid', 'Moon Bandit', 'Laser Finch', 'Plasma Rose',
  'Comet King', 'Signal Witch', 'Saturn Five', 'Jade Photon', 'Rogue Quasar',
  'Zenith Owl', 'Astral Dash', 'Nova Scout', 'Orbit Queen', 'Photon Bear'
]);

function hash(value) {
  let result = 2166136261;
  for (const char of String(value || '')) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function defaultTopScore(view) {
  if (view === 'sector') return 180000;
  if (view === 'local') return 220000;
  if (view === 'friends') return 260000;
  if (view === 'tactical') return 520000;
  return 600000;
}

export function buildLeaderboardPresentationRoster(entries = [], {
  view = 'global',
  limit = 50
} = {}) {
  const verified = (Array.isArray(entries) ? entries : []).slice(0, limit);
  if (verified.length >= limit) return verified;
  const namesInUse = new Set(verified.map((entry) => String(entry?.name || entry?.playerName || '').trim().toUpperCase()));
  const lastVerifiedScore = Math.max(0, Number(verified[verified.length - 1]?.score) || 0);
  const topScore = Math.max(lastVerifiedScore, Number(verified[0]?.score) || defaultTopScore(view));
  let previousScore = lastVerifiedScore || Math.round(topScore * Math.pow(0.935, verified.length));
  const seed = hash(`${view}:${verified.length}:${topScore}`);
  const simulated = [];
  for (let rank = verified.length + 1; rank <= limit; rank += 1) {
    const nameIndex = (seed + rank * 17) % CPU_RIVAL_CALLSIGNS.length;
    let name = CPU_RIVAL_CALLSIGNS[nameIndex];
    let suffix = 2;
    while (namesInUse.has(name.toUpperCase())) name = `${CPU_RIVAL_CALLSIGNS[nameIndex]} ${suffix++}`;
    namesInUse.add(name.toUpperCase());
    const drop = 0.018 + (((seed >>> (rank % 16)) + rank * 11) % 24) / 1000;
    previousScore = Math.max(100, Math.min(previousScore - 1, Math.round(previousScore * (1 - drop))));
    const level = Math.max(1, Math.min(99, Math.floor(previousScore / 5000) + 1));
    simulated.push({
      rank,
      globalRank: rank,
      name,
      playerName: name,
      score: previousScore,
      level,
      levelReached: level,
      rank_index: Math.max(0, Math.min(29, Math.floor(level / 3))),
      rankIndex: Math.max(0, Math.min(29, Math.floor(level / 3))),
      source: 'cpu-rival',
      isCpuRival: true,
      presentationOnly: true,
      excludedFromCompetition: true
    });
  }
  return [...verified, ...simulated];
}

