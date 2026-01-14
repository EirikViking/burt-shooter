// Quick verification of rank name and texture path formatting
const { getRankName } = require('../src/utils/RankNames.js');

console.log('=== RANK NAME AND TEXTURE PATH VERIFICATION ===\n');

const testIndices = [0, 1, 5, 10, 15, 19];

testIndices.forEach(index => {
    const rankName = getRankName(index);
    const num = index.toString().padStart(3, '0');
    const texturePath = `/sprites/ranks/PNG/Default size/Gold/rank${num}.png`;

    console.log(`Rank ${index.toString().padStart(2, '0')}:`);
    console.log(`  Name: ${rankName}`);
    console.log(`  Texture: ${texturePath}`);
    console.log('');
});

console.log('✅ Verification complete');
