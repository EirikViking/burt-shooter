/**
 * Ship metadata for selection screen
 * Maps ship IDs to display names and lore descriptions
 */

export const ShipMetadata = {
  rank_ship_0: {
    name: 'STOKMARKNES SKUTA',
    description: 'Kurt Edgar\'s harbor cruiser. Slow but steady, like a ferry on Myre.',
    lore: 'harbor'
  },
  rank_ship_1: {
    name: 'ISBJØRN CLASSIC',
    description: 'Powered by beer and late nights. Legendary status in Melbu.',
    lore: 'beer'
  },
  rank_ship_2: {
    name: 'TUFSINGEN',
    description: 'The party starter. Brings chaos to every run.',
    lore: 'party'
  },
  rank_ship_3: {
    name: 'DEILI FETTA',
    description: 'Greasy, fast, and unforgettable. Like a Saturday night at the harbor.',
    lore: 'food'
  },
  rank_ship_4: {
    name: 'ROLAND TURBO',
    description: 'Engineered with precision. Still covered in beer stains.',
    lore: 'tech'
  },
  rank_ship_5: {
    name: 'GIGA GRIS',
    description: 'Massive firepower, minimal grace. Eirik approves.',
    lore: 'power'
  },
  rank_ship_6: {
    name: 'MELBU EXPRESS',
    description: 'Gets you there fast. Might not get you back.',
    lore: 'speed'
  },
  rank_ship_7: {
    name: 'KJØTTDEIG SPECIAL',
    description: 'Ground beef vibes. Surprisingly effective in combat.',
    lore: 'food'
  },
  rank_ship_8: {
    name: 'BURT PROTOTYPE',
    description: 'The original. Respect the classics.',
    lore: 'legacy'
  }
};

/**
 * Get list of selectable ships with metadata
 */
export function getSelectableShips() {
  return Object.keys(ShipMetadata).map(id => ({
    id,
    ...ShipMetadata[id]
  }));
}

/**
 * Get ship metadata by ID
 */
export function getShipMetadata(shipId) {
  return ShipMetadata[shipId] || null;
}

/**
 * Get default ship ID
 */
export function getDefaultShipId() {
  return 'rank_ship_0';
}

/**
 * Validate ship ID exists
 */
export function isValidShipId(shipId) {
  return !!ShipMetadata[shipId];
}
