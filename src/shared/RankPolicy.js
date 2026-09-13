// Shared Rank Policy - Used by both frontend and backend.
// DO NOT MODIFY WITHOUT UPDATING BOTH DEPLOYMENTS.

export const NUM_RANKS = 40;
export const MAX_RANK_INDEX = 39;
export const MAX_AUTHORED_RANK_NUMBER = 40;
export const POST_CAP_PILOT_XP_STEP = 640000;
export const START_LEVEL = 1;
export const END_LEVEL = 410;

const LEVEL_THRESHOLDS = [
    1,
    2,
    3,
    5,
    7,
    9,
    11,
    14,
    17,
    20,
    24,
    28,
    32,
    36,
    40,
    44,
    48,
    52,
    56,
    60,
    68,
    77,
    87,
    98,
    110,
    123,
    137,
    152,
    168,
    185,
    203,
    222,
    242,
    263,
    285,
    308,
    332,
    357,
    383,
    410
];

const PILOT_XP_THRESHOLDS = [
    0,
    650,
    1600,
    3000,
    5000,
    7600,
    10800,
    14600,
    19000,
    24200,
    30400,
    37800,
    46600,
    57000,
    69400,
    84200,
    101800,
    122800,
    147800,
    177500,
    225000,
    285000,
    360000,
    450000,
    555000,
    675000,
    815000,
    975000,
    1155000,
    1360000,
    1590000,
    1850000,
    2140000,
    2465000,
    2830000,
    3240000,
    3700000,
    4215000,
    4790000,
    5430000
];

const RANK_TITLES = [
    "Cadet",
    "Button Warmer",
    "Pixel Pilot",
    "Formation Breaker",
    "Laser Wrangler",
    "Bonus Hunter",
    "Combo Courier",
    "Swarm Dodger",
    "Arcade Ace",
    "Quarter Captain",
    "Nebula Striker",
    "Boss Baiter",
    "Pattern Reader",
    "Cabinet Champion",
    "Wave Surgeon",
    "Starline Veteran",
    "High-Score Hero",
    "Swarm Nemesis",
    "Boss Rush Royalty",
    "Arcade Legend",
    "Black-Star Bailiff",
    "Static Undertaker",
    "Void Receipt",
    "Meteor Notary",
    "Hull Sermonizer",
    "Photon Debt King",
    "Comet Knife Saint",
    "Redline Ghost",
    "Grudge Astronaut",
    "Zero-G Bastard",
    "Cabinet War Pope",
    "Starvektor Baron",
    "Boss-Mouth Doctor",
    "Laser Coffin Clerk",
    "Swarm Tax Marshal",
    "Nova Ash Colonel",
    "Dead-Sun Mechanic",
    "Black Box Prophet",
    "Final Coin Tyrant",
    "Heat-Death Champion"
];

const RANK_LORE = [
    "New hands. Clean canopy. The swarm has not learned your smell yet.",
    "The button got hot. You called it strategy and nobody stopped you.",
    "Small ship, sharp nerves. The stars blinked first.",
    "You broke the pretty shape. It complained in math.",
    "The laser behaved. Briefly. You did not.",
    "You saw the shiny thing and lived. That counts as culture.",
    "You carried a combo through weather that wanted your bones.",
    "The swarm dodged left. You were already rude on the right.",
    "You made the cabinet proud. It charged interest.",
    "You spent one quarter and bought a tiny war.",
    "The nebula opened. You answered with receipts and fire.",
    "The boss wanted bait. You brought teeth.",
    "Patterns talked. You listened with both guns.",
    "The cabinet crowned you, then asked for another run.",
    "You cut waves clean enough to scare the scoreboard.",
    "Old pilots nod. Young pilots check your replay twice.",
    "The score climbed high enough to need oxygen.",
    "The swarm put your name in its emergency book.",
    "Bosses now arrive with lawyers and bad news.",
    "Legend is the old ceiling. You used it as a floor.",
    "You served the swarm notice. It ate the paper. You kept the receipt.",
    "You buried static in a shallow grave and heard it singing.",
    "The void handed you a bill. You paid in boss parts.",
    "Every meteor signed your log. Most used teeth.",
    "Your hull preached survival. The bullets converted late.",
    "Light owes you money. You collect at muzzle speed.",
    "The comet came fast. You made it kneel and sparkle.",
    "You died in three simulations and won in the one that mattered.",
    "The grudge wore a helmet. You removed both.",
    "Gravity called you names. You did not answer downward.",
    "The cabinet declared war. You became its religion.",
    "Your name bent starlanes. Insurance stopped returning calls.",
    "You opened the boss mouth and practiced medicine with rockets.",
    "The laser coffin was occupied. Then it was fireworks.",
    "The swarm filed taxes. You audited it with a cannon.",
    "Nova ash fell like snow. You kept flying because snow is soft.",
    "The dead sun coughed. You fixed it with bad intentions.",
    "The black box told the truth. You made it funnier.",
    "The final coin screamed. You spent it anyway.",
    "The universe cooled. Your trigger finger did not."
];

function sanitizeLevel(level) {
    if (typeof level !== 'number' || !Number.isFinite(level) || level < START_LEVEL) {
        return START_LEVEL;
    }
    return Math.floor(level);
}

function sanitizePilotXp(pilotXp) {
    if (typeof pilotXp !== 'number' || !Number.isFinite(pilotXp) || pilotXp < 0) {
        return 0;
    }
    return Math.floor(pilotXp);
}

const MAX_SAFE_PILOT_XP = BigInt(Number.MAX_SAFE_INTEGER);
const FINAL_AUTHORED_PILOT_XP = BigInt(PILOT_XP_THRESHOLDS[MAX_RANK_INDEX]);
const POST_CAP_PILOT_XP_STEP_BIGINT = BigInt(POST_CAP_PILOT_XP_STEP);

export function normalizePilotXpExact(value, fallback = '0') {
    if (typeof value === 'bigint') return value >= 0n ? value.toString() : normalizePilotXpExact(fallback, '0');
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^\d+$/.test(trimmed)) return trimmed.replace(/^0+(?=\d)/, '');
        return normalizePilotXpExact(fallback, '0');
    }
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        return BigInt(Math.floor(value)).toString();
    }
    return fallback === value ? '0' : normalizePilotXpExact(fallback, '0');
}

export function comparePilotXpExact(a, b) {
    const left = normalizePilotXpExact(a);
    const right = normalizePilotXpExact(b);
    if (left.length !== right.length) return left.length < right.length ? -1 : 1;
    return left === right ? 0 : (left < right ? -1 : 1);
}

export function maxPilotXpExact(a, b) {
    return comparePilotXpExact(a, b) >= 0 ? normalizePilotXpExact(a) : normalizePilotXpExact(b);
}

export function addPilotXpExact(pilotXpExact, xpGained) {
    const base = BigInt(normalizePilotXpExact(pilotXpExact));
    const addition = BigInt(normalizePilotXpExact(xpGained));
    return (base + addition).toString();
}

export function getPilotXpCompatibilityNumber(pilotXpExact) {
    const exact = BigInt(normalizePilotXpExact(pilotXpExact));
    return Number(exact > MAX_SAFE_PILOT_XP ? MAX_SAFE_PILOT_XP : exact);
}

export function getAuthoredRankFromPilotXpExact(pilotXpExact) {
    const exact = BigInt(normalizePilotXpExact(pilotXpExact));
    for (let i = PILOT_XP_THRESHOLDS.length - 1; i >= 0; i--) {
        if (exact >= BigInt(PILOT_XP_THRESHOLDS[i])) return i;
    }
    return 0;
}

export function getCareerDisplayRankExact(pilotXpExact) {
    const exact = BigInt(normalizePilotXpExact(pilotXpExact));
    if (exact < FINAL_AUTHORED_PILOT_XP) {
        return String(getAuthoredRankFromPilotXpExact(exact) + 1);
    }
    return (BigInt(MAX_AUTHORED_RANK_NUMBER) + ((exact - FINAL_AUTHORED_PILOT_XP) / POST_CAP_PILOT_XP_STEP_BIGINT)).toString();
}

export function getCareerRankProgress(pilotXpExact) {
    const exactString = normalizePilotXpExact(pilotXpExact);
    const exact = BigInt(exactString);
    const authoredRankIndex = getAuthoredRankFromPilotXpExact(exact);
    const displayRankExact = getCareerDisplayRankExact(exact);

    if (exact < FINAL_AUTHORED_PILOT_XP) {
        const currentThreshold = BigInt(PILOT_XP_THRESHOLDS[authoredRankIndex]);
        const nextThreshold = BigInt(PILOT_XP_THRESHOLDS[authoredRankIndex + 1]);
        const xpIntoRank = exact - currentThreshold;
        const spread = nextThreshold - currentThreshold;
        return {
            rankIndex: authoredRankIndex,
            authoredRankIndex,
            title: getRankTitle(authoredRankIndex),
            pilotXp: getPilotXpCompatibilityNumber(exact),
            pilotXpExact: exactString,
            displayRankExact,
            currentThreshold: Number(currentThreshold),
            currentThresholdExact: currentThreshold.toString(),
            nextThreshold: Number(nextThreshold),
            nextThresholdExact: nextThreshold.toString(),
            xpIntoRank: Number(xpIntoRank),
            xpIntoRankExact: xpIntoRank.toString(),
            xpToNextRank: Number(nextThreshold - exact),
            xpToNextRankExact: (nextThreshold - exact).toString(),
            progress: Number(xpIntoRank) / Number(spread),
            postCap: false
        };
    }

    const completedPostCapRanks = (exact - FINAL_AUTHORED_PILOT_XP) / POST_CAP_PILOT_XP_STEP_BIGINT;
    const currentThreshold = FINAL_AUTHORED_PILOT_XP + completedPostCapRanks * POST_CAP_PILOT_XP_STEP_BIGINT;
    const nextThreshold = currentThreshold + POST_CAP_PILOT_XP_STEP_BIGINT;
    const xpIntoRank = exact - currentThreshold;
    return {
        rankIndex: MAX_RANK_INDEX,
        authoredRankIndex: MAX_RANK_INDEX,
        title: getRankTitle(MAX_RANK_INDEX),
        pilotXp: getPilotXpCompatibilityNumber(exact),
        pilotXpExact: exactString,
        displayRankExact,
        currentThreshold: getPilotXpCompatibilityNumber(currentThreshold),
        currentThresholdExact: currentThreshold.toString(),
        nextThreshold: getPilotXpCompatibilityNumber(nextThreshold),
        nextThresholdExact: nextThreshold.toString(),
        xpIntoRank: Number(xpIntoRank),
        xpIntoRankExact: xpIntoRank.toString(),
        xpToNextRank: Number(nextThreshold - exact),
        xpToNextRankExact: (nextThreshold - exact).toString(),
        progress: Number(xpIntoRank) / POST_CAP_PILOT_XP_STEP,
        postCap: true
    };
}

export function formatCareerInteger(value, { maxPlainDigits = 9 } = {}) {
    const exact = normalizePilotXpExact(value);
    if (exact.length <= Math.max(1, Math.floor(maxPlainDigits))) return BigInt(exact).toLocaleString('en-US');
    const fraction = exact.slice(1, 3).replace(/0+$/, '');
    return `${exact[0]}${fraction ? `.${fraction}` : ''}e${exact.length - 1}`;
}

export function getRankFromLevel(level) {
    const normalizedLevel = sanitizeLevel(level);

    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (normalizedLevel >= LEVEL_THRESHOLDS[i]) return i;
    }

    return 0;
}

export function getRankFromScore(_score) {
    return 0;
}

export function getRankFromPilotXp(pilotXp) {
    const normalizedXp = sanitizePilotXp(pilotXp);

    for (let i = PILOT_XP_THRESHOLDS.length - 1; i >= 0; i--) {
        if (normalizedXp >= PILOT_XP_THRESHOLDS[i]) return i;
    }

    return 0;
}

export function getRankTitle(rankIndex) {
    if (rankIndex < 0 || rankIndex >= NUM_RANKS) {
        return RANK_TITLES[0];
    }
    return RANK_TITLES[rankIndex];
}

export function getRankLore(rankIndex) {
    if (rankIndex < 0 || rankIndex >= NUM_RANKS) {
        return RANK_LORE[0];
    }
    return RANK_LORE[rankIndex];
}

export function getAllRankTitles() {
    return [...RANK_TITLES];
}

export function getAllRankLore() {
    return [...RANK_LORE];
}

export function getThresholds() {
    return [...LEVEL_THRESHOLDS];
}

export function getPilotXpThresholds() {
    return [...PILOT_XP_THRESHOLDS];
}

export function getRankThreshold(rankIndex) {
    if (rankIndex < 0 || rankIndex >= NUM_RANKS) {
        return START_LEVEL;
    }
    return LEVEL_THRESHOLDS[rankIndex];
}

export function getRankLevelThreshold(rankIndex) {
    return getRankThreshold(rankIndex);
}

export function getPilotXpThreshold(rankIndex) {
    if (rankIndex < 0 || rankIndex >= NUM_RANKS) {
        return PILOT_XP_THRESHOLDS[0];
    }
    return PILOT_XP_THRESHOLDS[rankIndex];
}

export function getNextRankThreshold(currentRankIndex) {
    if (currentRankIndex >= MAX_RANK_INDEX) {
        return LEVEL_THRESHOLDS[MAX_RANK_INDEX];
    }
    return LEVEL_THRESHOLDS[currentRankIndex + 1];
}

export function getNextRankLevelThreshold(currentRankIndex) {
    return getNextRankThreshold(currentRankIndex);
}

export function getNextPilotXpThreshold(currentRankIndex) {
    if (currentRankIndex >= MAX_RANK_INDEX) {
        return PILOT_XP_THRESHOLDS[MAX_RANK_INDEX];
    }
    return PILOT_XP_THRESHOLDS[currentRankIndex + 1];
}

export function getPilotRankProgress(pilotXp) {
    const normalizedXp = sanitizePilotXp(pilotXp);
    const rankIndex = getRankFromPilotXp(normalizedXp);
    const currentThreshold = getPilotXpThreshold(rankIndex);
    const nextThreshold = getNextPilotXpThreshold(rankIndex);

    if (nextThreshold === currentThreshold) {
        return {
            rankIndex,
            title: getRankTitle(rankIndex),
            pilotXp: normalizedXp,
            currentThreshold,
            nextThreshold,
            xpIntoRank: 0,
            xpToNextRank: 0,
            progress: 1
        };
    }

    const xpIntoRank = Math.max(0, normalizedXp - currentThreshold);
    const spread = Math.max(1, nextThreshold - currentThreshold);
    return {
        rankIndex,
        title: getRankTitle(rankIndex),
        pilotXp: normalizedXp,
        currentThreshold,
        nextThreshold,
        xpIntoRank,
        xpToNextRank: Math.max(0, nextThreshold - normalizedXp),
        progress: Math.max(0, Math.min(1, xpIntoRank / spread))
    };
}
