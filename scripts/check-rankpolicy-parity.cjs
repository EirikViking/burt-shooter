// RankPolicy Parity Guard
// Prevents divergence between frontend and backend RankPolicy files

const fs = require('fs');
const path = require('path');

const FRONTEND_PATH = 'src/shared/RankPolicy.js';
const BACKEND_PATH = 'functions/shared/RankPolicy.js';

console.log('[RankPolicy Parity] Checking frontend/backend consistency...\n');

const frontendFullPath = path.join(process.cwd(), FRONTEND_PATH);
const backendFullPath = path.join(process.cwd(), BACKEND_PATH);

// Check if both files exist
if (!fs.existsSync(frontendFullPath)) {
    console.error(`❌ ERROR: ${FRONTEND_PATH} not found`);
    process.exit(1);
}

if (!fs.existsSync(backendFullPath)) {
    console.error(`❌ ERROR: ${BACKEND_PATH} not found`);
    process.exit(1);
}

// Read both files
const frontendContent = fs.readFileSync(frontendFullPath, 'utf8');
const backendContent = fs.readFileSync(backendFullPath, 'utf8');

// Compare content
if (frontendContent !== backendContent) {
    console.error('❌ RANKPOLICY PARITY FAILED: Files differ!');
    console.error(`   Frontend: ${FRONTEND_PATH}`);
    console.error(`   Backend:  ${BACKEND_PATH}`);
    console.error('   These files must be identical to ensure consistent rank calculation.');
    console.error('');
    process.exit(1);
}

console.log('✅ RankPolicy parity check passed: Frontend and backend files are identical.');
