export const RankNames = [
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
    "Arcade Legend"
];

export function getRankName(index) {
    if (index < 0) index = 0;
    if (index >= RankNames.length) index = RankNames.length - 1;
    return RankNames[index];
}
