import { getTacticalDraftMeta } from './TacticalDraft.js';

const CATEGORY_ORDER = Object.freeze(['offense', 'mobility', 'defense', 'utility']);

const PRIMARY_DOCTRINES = Object.freeze({
  offense: Object.freeze({ id: 'gunship', name: 'GUNSHIP DOCTRINE', color: 0xff6d8f }),
  mobility: Object.freeze({ id: 'phantom', name: 'PHANTOM DOCTRINE', color: 0x57e8ff }),
  defense: Object.freeze({ id: 'bastion', name: 'BASTION DOCTRINE', color: 0x70ffb1 }),
  utility: Object.freeze({ id: 'salvage', name: 'SALVAGE DOCTRINE', color: 0xffd56a })
});

const HYBRID_DOCTRINES = Object.freeze({
  'mobility+offense': Object.freeze({ id: 'strike_vector', name: 'STRIKE VECTOR', color: 0xff83c9 }),
  'defense+offense': Object.freeze({ id: 'siege_bulwark', name: 'SIEGE BULWARK', color: 0xffb080 }),
  'offense+utility': Object.freeze({ id: 'arsenal_network', name: 'ARSENAL NETWORK', color: 0xffb86a }),
  'defense+mobility': Object.freeze({ id: 'aegis_vector', name: 'AEGIS VECTOR', color: 0x68f6d8 }),
  'mobility+utility': Object.freeze({ id: 'courier_matrix', name: 'COURIER MATRIX', color: 0x7be7d7 }),
  'defense+utility': Object.freeze({ id: 'fortress_network', name: 'FORTRESS NETWORK', color: 0xb8e98a })
});

const SYNTHESIS_DOCTRINE = Object.freeze({ id: 'nova_synthesis', name: 'NOVA SYNTHESIS', color: 0xcaa6ff });

function normalizeIds(ids) {
  return Array.isArray(ids) ? ids.map((id) => String(id || '').trim()).filter(Boolean) : [];
}

export function analyzeTacticalDoctrine(selectedIds = [], consumedIds = []) {
  const consumed = new Set(normalizeIds(consumedIds));
  const activeIds = normalizeIds(selectedIds).filter((id) => !consumed.has(id));
  if (!activeIds.length) return null;

  const counts = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, 0]));
  for (const id of activeIds) {
    const category = getTacticalDraftMeta(id)?.category;
    if (category in counts) counts[category] += 1;
  }
  const ranked = CATEGORY_ORDER
    .map((category, order) => ({ category, count: counts[category], order }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.order - b.order);
  if (!ranked.length) return null;

  const totalPicks = ranked.reduce((sum, entry) => sum + entry.count, 0);
  const spread = ranked[0].count - ranked[ranked.length - 1].count;
  const isSynthesis = totalPicks >= 4 && ranked.length >= 3 && spread <= 1;
  const isHybrid = !isSynthesis && ranked.length >= 2 && ranked[0].count - ranked[1].count <= 1;
  const pairKey = isHybrid ? [ranked[0].category, ranked[1].category].sort().join('+') : null;
  const identity = isSynthesis
    ? SYNTHESIS_DOCTRINE
    : isHybrid
      ? HYBRID_DOCTRINES[pairKey] || PRIMARY_DOCTRINES[ranked[0].category]
      : PRIMARY_DOCTRINES[ranked[0].category];
  const stage = totalPicks >= 5 ? 'ASCENDANT' : totalPicks >= 3 ? 'ONLINE' : 'CALIBRATING';

  return Object.freeze({
    ...identity,
    stage,
    totalPicks,
    activeIds: Object.freeze(activeIds.slice()),
    categories: Object.freeze({ ...counts }),
    leadingCategories: Object.freeze(ranked.slice(0, 3).map((entry) => entry.category)),
    hybrid: isHybrid,
    synthesis: isSynthesis
  });
}

export function getTacticalDoctrineDisplay(doctrine = null) {
  if (!doctrine?.name) return null;
  return `${doctrine.name} // ${doctrine.stage}`;
}

export function projectTacticalDoctrine(selectedIds = [], consumedIds = [], candidateId = null) {
  const id = String(candidateId || '').trim();
  const before = analyzeTacticalDoctrine(selectedIds, consumedIds);
  const meta = getTacticalDraftMeta(id);
  if (!id || !meta) return Object.freeze({ before, after: before, valid: false, consumed: false, identityChanged: false, stageChanged: false });
  const nextSelected = [...normalizeIds(selectedIds), id];
  const nextConsumed = meta.consumedOnApply
    ? [...normalizeIds(consumedIds), id]
    : normalizeIds(consumedIds);
  const after = analyzeTacticalDoctrine(nextSelected, nextConsumed);
  return Object.freeze({
    before,
    after,
    valid: true,
    consumed: meta.consumedOnApply === true,
    identityChanged: before?.id !== after?.id,
    stageChanged: before?.stage !== after?.stage
  });
}

export const TACTICAL_DOCTRINE_NAMES = Object.freeze([
  ...Object.values(PRIMARY_DOCTRINES).map((entry) => entry.name),
  ...Object.values(HYBRID_DOCTRINES).map((entry) => entry.name),
  SYNTHESIS_DOCTRINE.name
]);
