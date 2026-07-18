import { getAllRankTitles } from '../shared/RankPolicy.js';

export const RankNames = getAllRankTitles();

export function getRankName(index) {
    if (index < 0) index = 0;
    if (index >= RankNames.length) index = RankNames.length - 1;
    return RankNames[index];
}
