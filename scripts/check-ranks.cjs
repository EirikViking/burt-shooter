// Rank System Build Guard
// Prevents accidental reintroduction of 78-rank assumptions

const fs = require('fs');
const path = require('path');

const BANNED_PATTERNS = [
    { pattern: /<= 77/g, description: 'Loop to 77 (should be < NUM_RANKS)' },
    { pattern: /\b77\b/g, description: 'Hardcoded 77 (should use MAX_RANK_INDEX)' },
    { pattern: /length:\s*78/g, description: 'Array length 78 (should be NUM_RANKS)' },
    { pattern: /Array\.from\(\{\s*length:\s*78/g, description: 'Array.from with length 78' },
    { pattern: /for\s*\([^)]*<=\s*77/g, description: 'For loop to 77' }
];

const FILES_TO_CHECK = [
    'src/managers/RankManager.js',
    'src/utils/RankAssets.js',
    'src/assets/assetManifest.js'
];

let hasErrors = false;

console.log('[Rank Guard] Checking for 78-rank regressions...\n');

FILES_TO_CHECK.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
        console.warn(`[Rank Guard] Warning: ${filePath} not found, skipping`);
        return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');

    BANNED_PATTERNS.forEach(({ pattern, description }) => {
        const matches = content.match(pattern);
        if (matches) {
            console.error(`❌ ERROR in ${filePath}:`);
            console.error(`   Found: ${description}`);
            console.error(`   Matches: ${matches.join(', ')}`);
            console.error('');
            hasErrors = true;
        }
    });
});

// Verify RankPolicy constants
const rankPolicyPath = path.join(process.cwd(), 'src/shared/RankPolicy.js');
if (fs.existsSync(rankPolicyPath)) {
    const rankPolicyContent = fs.readFileSync(rankPolicyPath, 'utf8');
    if (!rankPolicyContent.includes('START_SCORE = 5000')) {
        console.error('❌ ERROR: RankPolicy missing START_SCORE = 5000');
        hasErrors = true;
    }
    if (!rankPolicyContent.includes('END_SCORE = 1000000')) {
        console.error('❌ ERROR: RankPolicy missing END_SCORE = 1000000');
        hasErrors = true;
    }
}

if (hasErrors) {
    console.error('❌ RANK GUARD FAILED: Rank system violations detected!');
    console.error('   The game uses 20 ranks (0-19) with thresholds 5000-1000000.');
    console.error('   Check src/shared/RankPolicy.js for the source of truth.');
    console.error('');
    process.exit(1);
} else {
    console.log('✅ Rank guard passed: No rank system violations detected.');
}
