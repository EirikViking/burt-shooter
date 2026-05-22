#!/usr/bin/env node

(async () => {
  const {
    getThresholds,
    getRankFromLevel,
    getRankTitle,
    NUM_RANKS,
    MAX_RANK_INDEX,
    START_LEVEL,
    END_LEVEL
  } = await import('../src/shared/RankPolicy.js');

  const thresholds = getThresholds();

  console.log('Rank Policy Summary');
  console.log(`NUM_RANKS: ${NUM_RANKS}`);
  console.log(`MAX_RANK_INDEX: ${MAX_RANK_INDEX}`);
  console.log(`START_LEVEL: ${START_LEVEL}`);
  console.log(`END_LEVEL: ${END_LEVEL}\n`);

  thresholds.forEach((level, index) => {
    console.log(`Rank ${String(index).padStart(2, '0')} ${getRankTitle(index)}: Level ${level}`);
  });

  console.log('\nTest Levels:');
  [1, 2, 11, 25, 45, 60, 80].forEach((level) => {
    const rank = getRankFromLevel(level);
    console.log(`Level ${level} -> Rank ${rank} ${getRankTitle(rank)}`);
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
