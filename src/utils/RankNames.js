export const RankNames = [
    "Kai Rookie",
    "Fjord Fisher",
    "Diesel Drifter",
    "Rekkverk Rebel",
    "Brobruker",
    "Torsk Tamer",
    "Mydland Mester",
    "Møysalen Klatrer",
    "Hadselhavn Hero",
    "Gulstad Gærning",
    "Børøya Boss",
    "Hurtigruta Hero",
    "Nordlys Veteran",
    "Vesterålen Vakt",
    "Lofoten Lord",
    "Galleri God",
    "Kulturhus King",
    "Stokmarknes Legend",
    "Melbu Myth",
    "ULTIMATE SVIN"
];

export function getRankName(index) {
    if (index < 0) index = 0;
    if (index >= RankNames.length) index = RankNames.length - 1;
    return RankNames[index];
}
