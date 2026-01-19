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
    textureIndex: 0,
    stats: {
      speed: 5.5,
      fireRate: 160,
      damage: 1
    },
    loreLong: `The Stokmarknes Skuta is Kurt Edgar's pride and joy, a vessel that's seen more harbor parties than actual combat. Legend has it this ship was originally a ferry between Myre and Stokmarknes, but after one too many late-night beer runs, Kurt decided it needed laser cannons. It's slow, it's steady, and it smells faintly of diesel and regret. The locals say if you listen closely, you can still hear the echo of drunk tourists singing "Sweet Caroline" from its hull. Perfect for beginners who appreciate the finer things in life, like not dying immediately.`
  },
  'row2_ship_2.png': {
    name: 'ISBJØRN CLASSIC',
    description: 'Powered by beer and late nights. Legendary status in Melbu.',
    lore: 'beer',
    textureIndex: 1,
    stats: {
      speed: 6,
      fireRate: 150,
      damage: 1
    },
    loreLong: `Named after the legendary Isbjørn beer that fuels half of Melbu's economy, this ship runs on pure Norwegian determination and questionable life choices. Built in someone's garage after a particularly inspiring Friday night, the Isbjørn Classic has become a symbol of "it'll probably work" engineering. The fuel tank is rumored to actually contain beer, which somehow makes it faster. Scientists are baffled. Locals are not. This ship has participated in more harbor races than anyone can remember, mostly because everyone was too drunk to keep count. It's balanced, reliable, and has a built-in bottle opener on the dashboard.`
  },
  'row2_ship_3_clean.png': {
    name: 'TUFSINGEN',
    description: 'The party starter. Brings chaos to every run.',
    lore: 'party',
    textureIndex: 2,
    stats: {
      speed: 6.5,
      fireRate: 145,
      damage: 1
    },
    loreLong: `Tufsingen translates roughly to "the tough one," but everyone knows it really means "the one who starts fights at parties." This ship showed up at a harbor gathering in 2019 and never left. Its pilot was last seen doing donuts around a fishing boat while blasting techno music at 3 AM. The ship itself seems to have gained sentience and now actively seeks chaos. It's faster than it should be, louder than it needs to be, and has racing stripes that were definitely added with spray paint. If you choose this ship, you're not here to win gracefully—you're here to make sure everyone remembers your name. Preferably while the authorities are still filing the incident report.`
  },
  'row2_ship_5.png': {
    name: 'DEILI FETTA',
    description: 'Greasy, fast, and unforgettable. Like a Saturday night at the harbor.',
    lore: 'food',
    textureIndex: 3,
    stats: {
      speed: 7,
      fireRate: 140,
      damage: 1
    },
    loreLong: `Deili Fetta, meaning "share the fat," is what happens when you let a chef design a spaceship. This vessel was allegedly built using parts from a food truck, a fishing boat, and what appears to be an old motorcycle. It's greasy, it's fast, and it leaves a trail that smells suspiciously like fried fish. The previous owner claimed it could outrun the coast guard, and while that's never been officially confirmed, nobody's been able to catch it to ask questions. The cockpit has a deep fryer. Nobody knows why. Nobody asks. This ship is for pilots who believe that if you're going down, you might as well go down with a full stomach and a story worth telling.`
  },
  'ship_extract_1.png': {
    name: 'ROLAND TURBO',
    description: 'Engineered with precision. Still covered in beer stains.',
    lore: 'tech',
    textureIndex: 4,
    stats: {
      speed: 6,
      fireRate: 150,
      damage: 1.2
    },
    loreLong: `The Roland Turbo represents the pinnacle of "we probably shouldn't have done this, but we did anyway" engineering. Roland, a mechanic from Melbu with more ambition than common sense, decided that normal ships were too boring. So he built this: a precision-engineered marvel that somehow runs on a mixture of high-octane fuel and whatever was left in the keg from last weekend. It's got the best targeting computer money can buy, mounted right next to a cup holder that's never been empty. The ship's AI has a Norwegian accent and occasionally suggests taking breaks for coffee. It's powerful, it's precise, and it absolutely should not work as well as it does. But here we are.`
  },
  'ship_extract_2.png': {
    name: 'GIGA GRIS',
    description: 'Massive firepower, minimal grace. Eirik approves.',
    lore: 'power',
    textureIndex: 5,
    stats: {
      speed: 5,
      fireRate: 180,
      damage: 2
    },
    loreLong: `Giga Gris, or "Giant Pig," is what happens when someone asks "how much firepower can we fit on this thing?" and nobody says no. Eirik personally approved this monstrosity, probably while laughing maniacally. It's slow, it's heavy, and it hits like a freight train driven by an angry Viking. The ship was originally designed for demolition work, but someone added laser cannons and called it a day. It handles like a drunk walrus, but when you hit something, it stays hit. The cockpit is reinforced with what appears to be old ship hull plating and optimism. Perfect for players who believe subtlety is for people with smaller guns. Eirik would be proud.`
  },
  'ship_extract_3.png': {
    name: 'MELBU EXPRESS',
    description: 'Gets you there fast. Might not get you back.',
    lore: 'speed',
    textureIndex: 6,
    stats: {
      speed: 7.5,
      fireRate: 150,
      damage: 1
    },
    loreLong: `The Melbu Express is the fastest thing to come out of Melbu since that time someone's boat broke loose during a storm and ended up in Sweden. This ship doesn't do "slow." It doesn't do "careful." It does "hold on and pray" at speeds that make physicists uncomfortable. The original pilot claimed he could make the Stokmarknes run in under twelve parsecs, which doesn't make sense because parsecs measure distance, but nobody corrected him because he was going too fast to hear. The ship's engine is held together with zip ties, hope, and what might be duct tape. It's a miracle of terrible decisions that somehow works. Choose this if you like living dangerously and arriving fashionably early to your own funeral.`
  },
  'ship_extract_5.png': {
    name: 'KJØTTDEIG SPECIAL',
    description: 'Ground beef vibes. Surprisingly effective in combat.',
    lore: 'food',
    textureIndex: 7,
    stats: {
      speed: 6,
      fireRate: 140,
      damage: 1
    },
    loreLong: `The Kjøttdeig Special, named after ground beef for reasons nobody can quite explain, is the ship equivalent of a mystery meat sandwich that's somehow delicious. It was found abandoned in a harbor parking lot with a note that said "good luck" and a half-eaten meatball sub in the cockpit. Despite its questionable origins, this ship has proven surprisingly effective in combat. It's reliable, it's consistent, and it has a weird compartment that keeps producing meatballs. The previous owner claimed the ship was haunted by the ghost of a chef who died doing what he loved: making questionable food choices. Whether that's true or not, the ship definitely has personality. And it definitely smells like ground beef. You get used to it.`
  },
  'ship_new.png': {
    name: 'BURT PROTOTYPE',
    description: 'The original. Respect the classics.',
    lore: 'legacy',
    textureIndex: 8,
    stats: {
      speed: 6,
      fireRate: 150,
      damage: 1
    },
    loreLong: `The Burt Prototype is where it all began. This is the original ship that started the legend, back when "Burt" was just a guy with a welder, a dream, and access to a junkyard. It's not the fastest. It's not the strongest. But it's the one that proved this whole crazy idea could work. Every scratch, every dent, every questionable repair job tells a story of survival against impossible odds. The ship has been through more battles than anyone can count, and it's still here, still flying, still refusing to quit. Choosing this ship is a statement: you don't need the newest, shiniest toy to win. You just need heart, determination, and a ship that's too stubborn to die. Respect the classics. Respect the Burt.`
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

/**
 * Get ship usage count from localStorage
 */
export function getShipUsage(spriteKey) {
  try {
    const data = localStorage.getItem('burt.shipUsage.v1');
    const usage = data ? JSON.parse(data) : {};
    return usage[spriteKey] || 0;
  } catch (e) {
    console.warn('[ShipMetadata] Failed to get usage:', e);
    return 0;
  }
}

/**
 * Get total usage count across all ships
 */
export function getTotalUsage() {
  try {
    const total = localStorage.getItem('burt.shipUsageTotal.v1');
    return total ? parseInt(total, 10) : 0;
  } catch (e) {
    console.warn('[ShipMetadata] Failed to get total usage:', e);
    return 0;
  }
}

/**
 * Increment ship usage count
 */
export function incrementShipUsage(spriteKey) {
  try {
    // Get current usage
    const data = localStorage.getItem('burt.shipUsage.v1');
    const usage = data ? JSON.parse(data) : {};

    // Increment ship usage
    usage[spriteKey] = (usage[spriteKey] || 0) + 1;
    localStorage.setItem('burt.shipUsage.v1', JSON.stringify(usage));

    // Increment total usage
    const total = getTotalUsage();
    localStorage.setItem('burt.shipUsageTotal.v1', String(total + 1));

    console.log('[ShipMetadata] Incremented usage for', spriteKey, 'to', usage[spriteKey]);
  } catch (e) {
    console.warn('[ShipMetadata] Failed to increment usage:', e);
  }
}
