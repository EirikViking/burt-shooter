// Explicit, narrow Steam launch presets. Unknown values never enable a test.
function readBossEncounterTest(args = []) {
  const values = args.filter(arg => arg.startsWith('--nova-encounter-test=') || arg.startsWith('--nova-mystery-test='));
  if (values.length !== 1) return null;
  if (values[0].startsWith('--nova-mystery-test=')) {
    const raw = values[0].slice('--nova-mystery-test='.length);
    if (raw === 'all') return 'mystery:all';
    const ids = require('./mysteryTestIds.json');
    // Steam users commonly enter the roster number shown in the Codex.
    // Accept a strict 1-based index while retaining the canonical slug form.
    const numeric = /^(?:[1-9]|[1-5][0-9])$/.test(raw) ? Number(raw) : 0;
    const id = numeric ? ids[numeric - 1] : raw;
    return ids.includes(id) ? `mystery:${id}` : null;
  }
  const preset = values[0].slice('--nova-encounter-test='.length);
  return ['dual-boss', 'boss-snake'].includes(preset) ? preset : null;
}

module.exports = { readBossEncounterTest };
