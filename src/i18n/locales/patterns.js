function keepValue(match, label) {
  return `${label} ${match[1]}`;
}

export function buildArcadePatterns(labels) {
  return Object.freeze([
    {
      id: 'score',
      regex: /^SCORE:? ?(.+)$/,
      replace: (match) => keepValue(match, labels.score)
    },
    {
      id: 'missionLevel',
      regex: /^LEVEL:? ?(.+?)(?:\s{2}|\s*\/\/\s*|\s*\|\s*)HOSTILES:? ?(.+?)(?:\s{2}|\s*\/\/\s*|\s*\|\s*)THREATS:? ?(.+)$/,
      replace: (match) => `${labels.level}: ${match[1]} | ${labels.hostiles}: ${match[2]} | ${labels.threats}: ${match[3]}`
    },
    {
      id: 'level',
      regex: /^LEVEL:? ?(.+)$/,
      replace: (match) => keepValue(match, labels.level)
    },
    {
      id: 'lives',
      regex: /^LIVES:? ?(.+)$/,
      replace: (match) => keepValue(match, labels.lives)
    },
    {
      id: 'bossHp',
      regex: /^BOSS HP (.+)$/,
      replace: (match) => `${labels.bossHp} ${match[1]}`
    },
    {
      id: 'incomingWave',
      regex: /^INCOMING WAVE (.+)$/,
      replace: (match) => labels.incomingWave(match[1])
    },
    {
      id: 'missionWave',
      regex: /^WAVE:? ?(.+?)(?:\s{2}|\s*\/\/\s*|\s*\|\s*)HOSTILES:? ?(.+?)(?:\s{2}|\s*\/\/\s*|\s*\|\s*)THREATS:? ?(.+)$/,
      replace: (match) => `${labels.wave}: ${match[1]} | ${labels.hostiles}: ${match[2]} | ${labels.threats}: ${match[3]}`
    },
    {
      id: 'wavePrefix',
      regex: /^Wave (\d+): (.+)$/i,
      replace: (match, helpers) => `${labels.waveTitle} ${match[1]}: ${helpers.translate(match[2])}`
    },
    {
      id: 'bossPrefix',
      regex: /^BOSS: (.+)$/,
      replace: (match, helpers) => `${labels.boss}: ${helpers.translate(match[1])}`
    },
    {
      id: 'chargesLeft',
      regex: /^(\d+) LEFT$/,
      replace: (match) => `${match[1]} ${labels.left}`
    },
    {
      id: 'trait',
      regex: /^TRAIT: (.+)$/,
      replace: (match, helpers) => `${labels.trait}: ${helpers.translate(match[1])}`
    },
    {
      id: 'ready',
      regex: /^(.+) READY$/,
      replace: (match, helpers) => labels.ready(helpers.translate(match[1]))
    },
    {
      id: 'inCount',
      regex: /^(.+) IN (\d+)$/,
      replace: (match, helpers) => labels.inCount(helpers.translate(match[1]), match[2])
    },
    {
      id: 'name',
      regex: /^NAME: (.*)$/,
      replace: (match) => `${labels.name}: ${match[1]}`
    },
    {
      id: 'rankUpAchievement',
      regex: /^Rank Up: (.+)$/,
      replace: (match, helpers) => `${labels.rankUp}: ${helpers.translate(match[1])}`
    },
    {
      id: 'reachRank',
      regex: /^Reach the (.+) rank\.$/,
      replace: (match, helpers) => labels.reachRank(helpers.translate(match[1]))
    },
    {
      id: 'reachLevel',
      regex: /^Reach Level (\d+)$/,
      replace: (match) => labels.reachLevel(match[1])
    },
    {
      id: 'usedTimes',
      regex: /^Used (\d+) times by players$/,
      replace: (match) => labels.usedTimes(match[1])
    },
    {
      id: 'hullsReady',
      regex: /^(\d+)\/(\d+) HULLS READY$/,
      replace: (match) => labels.hullsReady(match[1], match[2])
    },
    {
      id: 'shipSelectStatus',
      regex: /^HULL (\d+)\/(\d+)  \|  SERIES (\d+)\/(\d+)  \|  (.+)$/,
      replace: (match, helpers) => labels.shipSelectStatus(match, helpers.translate(match[5]))
    },
    {
      id: 'progressStats',
      regex: /^BEST LEVEL (.+)\nPROGRESSION RANK (.+)\nBEST SCORE (.+)$/,
      replace: (match) => labels.progressStats(match[1], match[2], match[3])
    },
    {
      id: 'scoreLevel',
      regex: /^Score (.+) \| Level (.+)$/,
      replace: (match) => `${labels.scoreTitle} ${match[1]} | ${labels.levelTitle} ${match[2]}`
    },
    {
      id: 'thisRunCareerBest',
      regex: /^THIS RUN: LEVEL (.+)\nCAREER BEST: LEVEL (.+?)( - NEW BEST)?$/,
      replace: (match) => labels.thisRunCareerBest(match[1], match[2], Boolean(match[3]))
    },
    {
      id: 'runSummaryLine',
      regex: /^(GAME OVER|RUN CLEAR): SECTOR (.+?)  TIME (.+)$/,
      replace: (match, helpers) => `${helpers.translate(match[1])}: ${helpers.translate('SECTOR')} ${match[2]}  ${helpers.translate('TIME')} ${match[3]}`
    },
    {
      id: 'runRankXp',
      regex: /^RANK (.+?): (.+?)  CAREER XP: \+(.+)$/,
      replace: (match, helpers) => `${helpers.translate('RANK')} ${match[1]}: ${helpers.translate(match[2])}  ${helpers.translate('CAREER XP')}: +${match[3]}`
    },
    {
      id: 'bestSectorLine',
      regex: /^BEST SECTOR (.+?)( - NEW BEST)?$/,
      replace: (match, helpers) => `${helpers.translate('BEST SECTOR')} ${match[1]}${match[2] ? ` - ${helpers.translate('NEW BEST')}` : ''}`
    },
    {
      id: 'newShipUnlocked',
      regex: /^NEW (SHIP|SHIPS) UNLOCKED: (.+)\nVISIT THE HANGAR TO TRY (IT|THEM)$/,
      replace: (match) => labels.newShipUnlocked(match[2], match[1] === 'SHIPS')
    },
    {
      id: 'newShipUnlockedLine',
      regex: /^NEW (SHIP|SHIPS) UNLOCKED: (.+)$/,
      replace: (match) => labels.newShipUnlockedLine(match[2], match[1] === 'SHIPS')
    },
    {
      id: 'shipUnlockedLine',
      regex: /^(SHIP|SHIPS) UNLOCKED: (.+)$/,
      replace: (match) => (labels.shipUnlockedLine || labels.newShipUnlockedLine)(match[2], match[1] === 'SHIPS')
    },
    {
      id: 'visitHangarTryThem',
      regex: /^VISIT THE HANGAR TO TRY THEM$/,
      replace: () => labels.visitHangarTryThem || 'VISIT THE HANGAR'
    },
    {
      id: 'nextShipUnlock',
      regex: /^NEXT SHIP UNLOCK: (.+)$/,
      replace: (match) => `${labels.nextShipUnlock || labels.nextShip}: ${match[1]}`
    },
    {
      id: 'allShipsUnlocked',
      regex: /^ALL SHIPS UNLOCKED$/,
      replace: () => labels.allShipsUnlocked || labels.hangarCompleteLine
    },
    {
      id: 'nextShip',
      regex: /^NEXT SHIP: (.+)$/,
      replace: (match) => `${labels.nextShip}: ${match[1]}`
    },
    {
      id: 'careerLevelProgress',
      regex: /^CAREER LEVEL (.+?)\/(.+?) - (\d+) (LEVEL|LEVELS) TO GO$/,
      replace: (match) => labels.careerLevelProgress(match[1], match[2], match[3])
    },
    {
      id: 'careerLevelBetterRun',
      regex: /^CAREER LEVEL (.+?)\/(.+?) - ONE BETTER RUN$/,
      replace: (match) => labels.careerLevelBetterRun(match[1], match[2])
    },
    {
      id: 'hangarComplete',
      regex: /^HANGAR COMPLETE: ALL SHIPS UNLOCKED\nCAREER BEST: LEVEL (.+)$/,
      replace: (match) => labels.hangarComplete(match[1])
    },
    {
      id: 'hangarCompleteLine',
      regex: /^HANGAR COMPLETE: ALL SHIPS UNLOCKED$/,
      replace: () => labels.hangarCompleteLine
    },
    {
      id: 'nextCareerGoal',
      regex: /^NEXT CAREER GOAL: REACH LEVEL (.+)$/,
      replace: (match) => labels.nextCareerGoal(match[1])
    },
    {
      id: 'nextGoalGlobal',
      regex: /^NEXT GOAL: CLIMB THE GLOBAL BOARD$/,
      replace: () => labels.nextGoalGlobal
    },
    {
      id: 'nextGoalGlobalRank',
      regex: /^NEXT GOAL: CLIMB ONE GLOBAL RANK$/,
      replace: () => labels.nextGoalGlobalRank
    },
    {
      id: 'scoreStatus',
      regex: /^SCORE STATUS$/,
      replace: () => labels.scoreStatus || 'SCORE STATUS'
    },
    {
      id: 'savingScore',
      regex: /^SAVING SCORE$/,
      replace: () => labels.savingScore || 'SAVING SCORE'
    },
    {
      id: 'noVisibleLeaderboardSlot',
      regex: /^No visible leaderboard slot this run$/,
      replace: () => labels.noVisibleLeaderboardSlot || 'No visible leaderboard slot this run'
    },
    {
      id: 'runbackSummary',
      regex: /^Sector (.+?) \| (.+?) \| Level (.+)$/,
      replace: (match, helpers) => `${helpers.translate('SECTOR')} ${match[1]} | ${match[2]} | ${helpers.translate('LEVEL')} ${match[3]}`
    },
    {
      id: 'xpPlus',
      regex: /^XP \+(.+)$/,
      replace: (match) => `${labels.xp || 'XP'} +${match[1]}`
    },
    {
      id: 'nextRank',
      regex: /^Next rank: (.+)$/,
      replace: (match, helpers) => `${labels.nextRank || 'Next rank'}: ${helpers.translate(match[1])}`
    },
    {
      id: 'xpToNext',
      regex: /^XP to next: (.+)$/,
      replace: (match) => `${labels.xpToNext || 'XP to next'}: ${match[1]}`
    },
    {
      id: 'nextGoalReadable',
      regex: /^Next goal: (.+)$/,
      replace: (match, helpers) => `${labels.nextGoal || 'Next goal'}: ${helpers.translate(match[1])}`
    },
    {
      id: 'localSimpleRank',
      regex: /^Local: #([0-9]+)$/,
      replace: (match) => `${labels.localBoard}: #${match[1]}`
    },
    {
      id: 'localSimpleStatus',
      regex: /^Local: (Practice run|No score|Qualified|Backup ready)$/,
      replace: (match, helpers) => `${labels.localBoard}: ${helpers.translate(match[1])}`
    },
    {
      id: 'localSimpleNeed',
      regex: /^Local: Need (.+)$/,
      replace: (match) => `${labels.localBoard}: ${labels.need} ${match[1]}`
    },
    {
      id: 'localSimpleNotInTop',
      regex: /^Local: Not in local top ([0-9]+)$/,
      replace: (match) => labels.localNotInTop(match[1])
    },
    {
      id: 'globalSimpleRank',
      regex: /^Global: #([0-9]+)$/,
      replace: (match) => `${labels.globalBoard}: #${match[1]}`
    },
    {
      id: 'globalSimpleStatus',
      regex: /^Global: (Idle|Checking\.\.\.|Qualified|No slot|Offline - local still works|Submitting\.\.\.|Failed - local saved|Practice run|Score submitted)$/,
      replace: (match, helpers) => `${labels.globalBoard}: ${helpers.translate(match[1])}`
    },
    {
      id: 'globalSimpleClose',
      regex: /^Global: Close - need (.+)$/,
      replace: (match) => `${labels.globalBoard}: ${labels.close} - ${labels.need} ${match[1]}`
    },
    {
      id: 'steamSimpleRank',
      regex: /^Steam: #([0-9]+)$/,
      replace: (match) => `${labels.steam || 'Steam'}: #${match[1]}`
    },
    {
      id: 'newSteamBest',
      regex: /^New Steam best: #([0-9]+)$/,
      replace: (match) => `${labels.newSteamBest || 'New Steam best'}: #${match[1]}`
    },
    {
      id: 'steamSimpleStatus',
      regex: /^Steam: (Best unchanged|Rank updating\.\.\.|Unavailable - local backup saved|Score submitted|Ready|.+)$/,
      replace: (match, helpers) => `${labels.steam || 'Steam'}: ${helpers.translate(match[1])}`
    },
    {
      id: 'steamBestCompare',
      regex: /^Best: (.+) \| This run: (.+)$/,
      replace: (match) => `${labels.best || 'Best'}: ${match[1]} | ${labels.thisRun || 'This run'}: ${match[2]}`
    },
    {
      id: 'localNeed',
      regex: /^LOCAL BOARD: NEED (.+)$/,
      replace: (match) => `${labels.localBoard}: ${labels.need} ${match[1]}`
    },
    {
      id: 'localRankTitle',
      regex: /^LOCAL BOARD RANK #([0-9]+)$/,
      replace: (match) => `${labels.localBoard} ${labels.rank} #${match[1]}`
    },
    {
      id: 'localRank',
      regex: /^LOCAL BOARD: RANK #([0-9]+)$/,
      replace: (match) => `${labels.localBoard}: ${labels.rank} #${match[1]}`
    },
    {
      id: 'localTopRank',
      regex: /^LOCAL BOARD: TOP ([0-9]+) #([0-9]+)$/,
      replace: (match) => labels.localTopRank(match[1], match[2])
    },
    {
      id: 'localNotInTop',
      regex: /^LOCAL BOARD: NOT IN LOCAL TOP ([0-9]+)$/,
      replace: (match) => labels.localNotInTop(match[1])
    },
    {
      id: 'globalRank',
      regex: /^GLOBAL BOARD: RANK #([0-9]+)$/,
      replace: (match) => `${labels.globalBoard}: ${labels.rank} #${match[1]}`
    },
    {
      id: 'globalRankTop',
      regex: /^GLOBAL BOARD: RANK #(.+) - (NUMBER ONE|TOP THREE)$/,
      replace: (match, helpers) => `${labels.globalBoard}: ${labels.rank} #${match[1]} - ${helpers.translate(match[2])}`
    },
    {
      id: 'globalClose',
      regex: /^GLOBAL BOARD: CLOSE - NEED (.+)$/,
      replace: (match) => `${labels.globalBoard}: ${labels.close} - ${labels.need} ${match[1]}`
    },
    {
      id: 'globalRankPending',
      regex: /^GLOBAL BOARD: SUBMITTED - RANK PENDING$/,
      replace: (match, helpers) => `${labels.globalBoard}: ${helpers.translate('SUBMITTED')} - ${helpers.translate('RANK PENDING')}`
    },
    {
      id: 'localGlobalRankComment',
      regex: /^Local board rank #(.+)\. Global board rank #(.+)\.$/,
      replace: (match) => `${labels.localBoard}: ${labels.rank} #${match[1]}. ${labels.globalBoard}: ${labels.rank} #${match[2]}.`
    },
    {
      id: 'localGlobalPendingComment',
      regex: /^Local board rank #(.+)\. Global board rank pending\.$/,
      replace: (match, helpers) => `${labels.localBoard}: ${labels.rank} #${match[1]}. ${labels.globalBoard}: ${helpers.translate('RANK PENDING')}.`
    },
    {
      id: 'localGlobalStatusComment',
      regex: /^Local board rank #(.+)\. Global board status: (.+)\.$/,
      replace: (match, helpers) => `${labels.localBoard}: ${labels.rank} #${match[1]}. ${labels.globalBoard}: ${helpers.translate(match[2])}.`
    },
    {
      id: 'localGlobalPlacementComment',
      regex: /^Local board rank #(.+)\. Global rank #(.+)\. (.+)$/,
      replace: (match, helpers) => `${labels.localBoard}: ${labels.rank} #${match[1]}. ${labels.globalBoard}: ${labels.rank} #${match[2]}. ${helpers.translate(match[3])}`
    },
    {
      id: 'localNearGlobalComment',
      regex: /^Local board rank #(.+)\. Only (.+) more points for a global slot\. This was not a miss, it was a warning shot\.$/,
      replace: (match) => `${labels.localBoard}: ${labels.rank} #${match[1]}. ${labels.nearGlobalComment(match[2])}`
    },
    {
      id: 'localSlotStatusComment',
      regex: /^Local board slot secured\. Global board status is shown below\.$/,
      replace: (match, helpers) => `${helpers.translate('LOCAL BOARD SLOT')}. ${labels.globalBoard}.`
    },
    {
      id: 'globalPlacementComment',
      regex: /^Global rank #(.+)\. (.+)$/,
      replace: (match, helpers) => labels.globalPlacementComment(match[1], helpers.translate(match[2]))
    },
    {
      id: 'nearGlobalComment',
      regex: /^Only (.+) more points for a global slot\. This was not a miss, it was a warning shot\.$/,
      replace: (match) => labels.nearGlobalComment(match[1])
    },
    {
      id: 'steamBestMissLine',
      regex: /^THIS RUN DID NOT BEAT YOUR STEAM BEST: (.+)$/,
      replace: (match) => labels.steamBestMissLine(match[1])
    },
    {
      id: 'steamBestUnchangedComment',
      regex: /^Steam best unchanged\.$/,
      replace: (match, helpers) => helpers.translate('Steam best unchanged.')
    },
    {
      id: 'steamBestMissComment',
      regex: /^Steam best unchanged\. This run did not beat your Steam best: (.+)\.$/,
      replace: (match) => labels.steamBestMissComment(match[1])
    },
    {
      id: 'bossDefeatedRepair',
      regex: /^BOSS DEFEATED! \+1000\nHULL REPAIR \+(\d+)\n(.+)$/,
      replace: (match, helpers) => `${labels.bossDefeatedAward?.() || `${labels.bossDefeated}! +1000`}\n${labels.hullRepair} +${match[1]}\n${helpers.translate(match[2])}`
    },
    {
      id: 'hullRepairValue',
      regex: /^HULL REPAIR \+(\d+)$/,
      replace: (match) => `${labels.hullRepair} +${match[1]}`
    },
    {
      id: 'bossDefeated',
      regex: /^BOSS DEFEATED! \+1000\n(.+)$/,
      replace: (match, helpers) => `${labels.bossDefeatedAward?.() || `${labels.bossDefeated}! +1000`}\n${helpers.translate(match[1])}`
    },
    {
      id: 'rankBoost',
      regex: /^RANK BOOST: (.+)$/,
      replace: (match, helpers) => `${labels.rankBoost}: ${helpers.translate(match[1])}`
    },
    {
      id: 'sync',
      regex: /^SYNC (.+)$/,
      replace: (match, helpers) => `${labels.sync} ${helpers.translate(match[1])}`
    },
    {
      id: 'phaseCaption',
      regex: /^(BOSS WEAKENING|PATTERN SHIFT): (.+)$/,
      replace: (match, helpers) => `${helpers.translate(match[1])}: ${helpers.translate(match[2])}`
    }
  ]);
}
