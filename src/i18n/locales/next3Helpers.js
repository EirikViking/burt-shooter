const PRESERVE = new Set([
  'Nova Swarm',
  'NOVA SWARM',
  'Tinyfoundry Games',
  'TINYFOUNDRY GAMES',
  'Cabinet',
  'ENTER',
  'ESC',
  'WASD',
  'SPACE',
  'Space',
  'SFX',
  'FIRE',
  'A',
  'B',
  'Y',
  'START',
  'GAMEPAD',
  'NOVA',
  'ACE',
  'TFG'
]);

export function keepTechnicalTokens(text) {
  let result = String(text ?? '');
  for (const token of PRESERVE) {
    result = result.replaceAll(token, token);
  }
  return result;
}

export function makeFallback(prefix) {
  return (source) => {
    const text = String(source ?? '').trim();
    if (!text) return text;
    if (/^(Nova Swarm|NOVA SWARM|TINYFOUNDRY GAMES|Tinyfoundry Games)$/.test(text)) return text;
    if (/^[A-Z0-9 +/#:|()._-]+$/.test(text) && /ENTER|ESC|WASD|SPACE|SFX|GAMEPAD|START/.test(text)) {
      return text;
    }
    return `${prefix}: ${keepTechnicalTokens(text)
      .replace(/[A-Za-z]{3,}/g, '')
      .replace(/\s+/g, ' ')
      .trim()}`.trim();
  };
}
