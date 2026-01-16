const fs = require('fs');
const path = require('path');

// Generate a robust build ID (YYYY-MM-DD_HH-MM-SS)
// This ensures every deploy has a unique, ordered identifier
const now = new Date();
const pad = (n) => n.toString().padStart(2, '0');
const version = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
const buildId = `v${version}`;

console.log(`[Build] Generating version: ${buildId}`);

// 1. Write public/version.json
const versionData = {
    version: buildId,
    timestamp: now.toISOString()
};
const versionPath = path.join(__dirname, '../public/version.json');
fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));

// 2. Generate public/sw.js from template
// We use a template to ensure we don't overwrite source logic with a hardcoded version
const templatePath = path.join(__dirname, '../public/sw-template.js');
const swPath = path.join(__dirname, '../public/sw.js');

if (fs.existsSync(templatePath)) {
    const swTemplate = fs.readFileSync(templatePath, 'utf8');
    // Replace all instances of __VERSION__
    const swContent = swTemplate.replace(/__VERSION__/g, buildId);
    fs.writeFileSync(swPath, swContent);
    console.log(`[Build] Generated public/sw.js (CACHE_NAME: burt-shooter-${buildId})`);
} else {
    console.error('[Build] Error: public/sw-template.js not found!');
    process.exit(1);
}

// 3. Ensure _headers file exists for Cloudflare Cache-Control
const headersPath = path.join(__dirname, '../public/_headers');
const headersContent = `
/*
  X-Content-Type-Options: nosniff

# TASK 4: Mobile Safety Overrides - No Cache for HTML
/index.html
  Cache-Control: no-store, no-cache, must-revalidate, max-age=0
  
/version.json
  Cache-Control: no-store, no-cache, must-revalidate, max-age=0
  Access-Control-Allow-Origin: *

# Service Worker should never be cached long term
/sw.js
  Cache-Control: no-store, no-cache, must-revalidate, max-age=0

# Long cache for immutable assets (vite handles hashing for assets)
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;

// Append or create headers
// We'll just overwrite to ensure correctness for this task
fs.writeFileSync(headersPath, headersContent.trim());
console.log('[Build] Updated public/_headers for strict caching policies.');

// 4. Update index.html
const indexPath = path.join(__dirname, '../index.html');
if (fs.existsSync(indexPath)) {
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    // Replace content="dev" or content="v..." with new version inside the specific meta tag
    indexContent = indexContent.replace(
        /<meta name="build-version" content="[^"]*">/,
        `<meta name="build-version" content="${buildId}">`
    );
    fs.writeFileSync(indexPath, indexContent);
    console.log(`[Build] Updated index.html meta tag to ${buildId}`);
}
