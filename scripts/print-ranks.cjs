// Print rank thresholds and verify rank calculations
const { getThresholds, getRankFromScore, NUM_RANKS, MAX_RANK_INDEX, START_SCORE, END_SCORE } = require('../src/shared/RankPolicy.js');

console.log('=== RANK POLICY VERIFICATION ===\n');
console.log(`NUM_RANKS: ${NUM_RANKS}`);
console.log(`MAX_RANK_INDEX: ${MAX_RANK_INDEX}`);
console.log(`START_SCORE: ${START_SCORE}`);
console.log(`END_SCORE: ${END_SCORE}\n`);

console.log('=== RANK THRESHOLDS ===');
const thresholds = getThresholds();
thresholds.forEach((threshold, index) => {
    console.log(`Rank ${index.toString().padStart(2, '0')}: ${threshold.toLocaleString()}`);
});

console.log('\n=== RANK CALCULATION TESTS ===');
const tests = [
    { score: 0, expected: 0 },
    { score: 4999, expected: 0 },
    { score: 5000, expected: 1 },
    { score: 10000, expected: null }, // Will compute
    { score: 100000, expected: null },
    { score: 500000, expected: null },
    { score: 1000000, expected: 19 },
    { score: 2000000, expected: 19 } // Clamped to max
];

tests.forEach(test => {
    const result = getRankFromScore(test.score);
    const status = test.expected === null || result === test.expected ? '✅' : '❌';
    console.log(`${status} Score ${test.score.toLocaleString()} → Rank ${result} ${test.expected !== null ? `(expected ${test.expected})` : ''}`);
});

console.log('\n=== VERIFICATION COMPLETE ===');
