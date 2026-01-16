// Generate complete sprite catalog for build-time validation
// This does NOT affect runtime bundle size - it's a build guard only

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

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

console.log('[Sprite Catalog Generator]');
console.log('Scanning:', spritesDir);

if (!fs.existsSync(spritesDir)) {
    console.error('ERROR: public/sprites directory not found');
    process.exit(1);
}

const allFiles = walkDirectory(spritesDir);
const spriteFiles = allFiles
    .filter(file => imageExtensions.has(path.extname(file).toLowerCase()))
    .map(file => file.slice(publicDir.length).replace(/\\/g, '/'))
    .sort();

console.log('Found', spriteFiles.length, 'sprite files');

const catalog = {
    generated: new Date().toISOString(),
    totalSprites: spriteFiles.length,
    sprites: spriteFiles
};

const outputPath = path.join(cwd, 'scripts', 'sprite-catalog.json');
fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2), 'utf8');

console.log('✅ Catalog written to:', outputPath);
console.log('Total sprites indexed:', spriteFiles.length);
