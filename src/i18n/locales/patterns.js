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
      regex: /^WAVE (.+?)  HOSTILES (.+?)  THREATS (.+)$/,
      replace: (match) => `${labels.wave} ${match[1]}  ${labels.hostiles} ${match[2]}  ${labels.threats} ${match[3]}`
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
      id: 'newShipUnlocked',
      regex: /^NEW (SHIP|SHIPS) UNLOCKED: (.+)\nVISIT THE HANGAR TO TRY (IT|THEM)$/,
      replace: (match) => labels.newShipUnlocked(match[2], match[1] === 'SHIPS')
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
      id: 'steamBoard',
      regex: /^STEAM BOARD: (.+)$/,
      replace: (match, helpers) => `${labels.steamBoard}: ${helpers.translate(match[1])}`
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
