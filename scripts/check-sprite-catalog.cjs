// Check sprite catalog integrity at build time
// Ensures all sprites on disk are indexed and vice versa

const fs = require('fs');
const path = require('path');

function walkDirectory(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walkDirectory(fullPath));
        } else {
            results.push(fullPath);
        }
    }
    return results;
}

const cwd = process.cwd();
const publicDir = path.join(cwd, 'public');
const spritesDir = path.join(publicDir, 'sprites');
const catalogPath = path.join(cwd, 'scripts', 'sprite-catalog.json');

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

console.log('[Sprite Catalog Check]');

// Load catalog
if (!fs.existsSync(catalogPath)) {
    console.error('ERROR: sprite-catalog.json not found');
    console.error('Run: node scripts/generate-sprite-catalog.cjs');
    process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const catalogSet = new Set(catalog.sprites);

// Scan disk
const allFiles = walkDirectory(spritesDir);
const diskSprites = allFiles
    .filter(file => imageExtensions.has(path.extname(file).toLowerCase()))
    .map(file => file.slice(publicDir.length).replace(/\\/g, '/'))
    .sort();

const diskSet = new Set(diskSprites);

// Find mismatches
const missingFromCatalog = diskSprites.filter(s => !catalogSet.has(s));
const missingFromDisk = catalog.sprites.filter(s => !diskSet.has(s));

console.log('Disk sprites:', diskSprites.length);
console.log('Catalog sprites:', catalog.sprites.length);

let hasErrors = false;

if (missingFromCatalog.length > 0) {
    console.error('\n❌ ERROR: Sprites on disk but missing from catalog:', missingFromCatalog.length);
    console.error('First 30:');
    missingFromCatalog.slice(0, 30).forEach(s => console.error('  ', s));
    if (missingFromCatalog.length > 30) {
        console.error('  ... and', missingFromCatalog.length - 30, 'more');
    }
    hasErrors = true;
}

if (missingFromDisk.length > 0) {
    console.error('\n❌ ERROR: Sprites in catalog but missing from disk:', missingFromDisk.length);
    console.error('First 30:');
    missingFromDisk.slice(0, 30).forEach(s => console.error('  ', s));
    if (missingFromDisk.length > 30) {
        console.error('  ... and', missingFromDisk.length - 30, 'more');
    }
    hasErrors = true;
}

if (hasErrors) {
    console.error('\n❌ Sprite catalog check FAILED');
    console.error('Run: node scripts/generate-sprite-catalog.cjs');
    process.exit(1);
}

console.log('\n✅ Sprite catalog check passed');
console.log('All', diskSprites.length, 'sprites are properly indexed');
