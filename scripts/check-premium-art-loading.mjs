import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/effects/PremiumArt.js',import.meta.url),'utf8');
assert(!/import\s+\w+\s+from\s+['"][^'"]*public\//.test(source),'public art must load through its served URL in both source and packaged builds');
console.log('[premium-art-loading] PASS served URL, no direct public import');
