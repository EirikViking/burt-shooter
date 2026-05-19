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
    console.log(`[Build] Generated public/sw.js (CACHE_NAME: nova-swarm-${buildId})`);
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

# Keep Vite assets revalidatable. A transient Pages fallback must not poison a module URL.
/assets/*
  Cache-Control: no-store, no-cache, must-revalidate, max-age=0

# Voice files are overwritten at stable manifest paths. Never let an old announcer
# survive a new deploy through browser or edge cache.
/audio/voice/*
  Cache-Control: no-store, no-cache, must-revalidate, max-age=0
`;

// Append or create headers
// We'll just overwrite to ensure correctness for this task
fs.writeFileSync(headersPath, headersContent.trim());
console.log('[Build] Updated public/_headers for strict caching policies.');

// 4. Keep index.html stable in git.
// The runtime build stamp comes from public/version.json via Vite's __BUILD_ID__.
// Mutating index.html during every build makes clean checkouts look dirty.
console.log('[Build] Leaving index.html unchanged; runtime build ID is injected by Vite.');
