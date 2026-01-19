/**
 * Ship metadata for selection screen
 * Maps REAL sprite texture keys to display names and lore descriptions
 * These keys match the actual playerRankShips array in assetManifest.js
 */

export const ShipMetadata = {
  'row2_ship_1.png': {
    name: 'STOKMARKNES SKUTA',
    description: 'Kurt Edgar\'s harbor cruiser. Slow but steady, like a ferry on Myre.',
    lore: 'harbor',
    textureIndex: 0
  },
  'row2_ship_2.png': {
    name: 'ISBJØRN CLASSIC',
    description: 'Powered by beer and late nights. Legendary status in Melbu.',
    lore: 'beer',
    textureIndex: 1
  },
  'row2_ship_3_clean.png': {
    name: 'TUFSINGEN',
    description: 'The party starter. Brings chaos to every run.',
    lore: 'party',
    textureIndex: 2
  },
  'row2_ship_5.png': {
    name: 'DEILI FETTA',
    description: 'Greasy, fast, and unforgettable. Like a Saturday night at the harbor.',
    lore: 'food',
    textureIndex: 3
  },
  'ship_extract_1.png': {
    name: 'ROLAND TURBO',
    description: 'Engineered with precision. Still covered in beer stains.',
    lore: 'tech',
    textureIndex: 4
  },
  'ship_extract_2.png': {
    name: 'GIGA GRIS',
    description: 'Massive firepower, minimal grace. Eirik approves.',
    lore: 'power',
    textureIndex: 5
  },
  'ship_extract_3.png': {
    name: 'MELBU EXPRESS',
    description: 'Gets you there fast. Might not get you back.',
    lore: 'speed',
    textureIndex: 6
  },
  'ship_extract_5.png': {
    name: 'KJØTTDEIG SPECIAL',
    description: 'Ground beef vibes. Surprisingly effective in combat.',
    lore: 'food',
    textureIndex: 7
  },
  'ship_new.png': {
    name: 'BURT PROTOTYPE',
    description: 'The original. Respect the classics.',
    lore: 'legacy',
    textureIndex: 8
  }
};

/**
 * Get list of selectable ships with metadata
 */
export function getSelectableShips() {
  return Object.keys(ShipMetadata).map(spriteKey => ({
    spriteKey,
    ...ShipMetadata[spriteKey]
  }));
}

/**
 * Get ship metadata by sprite key
 */
export function getShipMetadata(spriteKey) {
  return ShipMetadata[spriteKey] || null;
}

/**
 * Get default ship sprite key
 */
export function getDefaultShipKey() {
  return 'row2_ship_1.png';
}

/**
 * Validate ship sprite key exists
 */
export function isValidShipKey(spriteKey) {
  return !!ShipMetadata[spriteKey];
}
