import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contentRoot = path.resolve(process.env.STEAM_PAYLOAD_ROOT || 'release/desktop/win-unpacked');
const outputPath = path.resolve(process.env.STEAM_PAYLOAD_MANIFEST || 'release/steamworks/steam_payload_manifest.json');
const versionPath = path.resolve(root, 'public/version.json');
const exeRelativePath = 'Nova Swarm.exe';

function rel(file, base = root) {
  return path.relative(base, file).replaceAll(path.sep, '/');
}

function hashFile(file) {
  const hash = createHash('sha256');
  hash.update(readFileSync(file));
  return hash.digest('hex');
}

function walkFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, files);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

if (!existsSync(versionPath)) {
  throw new Error('Missing public/version.json; build metadata is required for payload manifest.');
}

if (!existsSync(contentRoot) || !statSync(contentRoot).isDirectory()) {
  throw new Error(`Missing Steam payload directory: ${rel(contentRoot)}`);
}

const executablePath = path.join(contentRoot, exeRelativePath);
if (!existsSync(executablePath)) {
  throw new Error(`Missing Steam payload executable: ${rel(executablePath)}`);
}

const forbiddenLegacyExecutable = path.join(contentRoot, 'game.exe');
if (existsSync(forbiddenLegacyExecutable)) {
  throw new Error(`Forbidden legacy Steam payload executable found: ${rel(forbiddenLegacyExecutable)}`);
}

const version = JSON.parse(readFileSync(versionPath, 'utf8'));
const files = walkFiles(contentRoot)
  .sort((a, b) => rel(a, contentRoot).localeCompare(rel(b, contentRoot)))
  .map((file) => {
    const stats = statSync(file);
    return {
      path: rel(file, contentRoot),
      bytes: stats.size,
      sha256: hashFile(file),
      modifiedAt: stats.mtime.toISOString()
    };
  });

const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
const executable = files.find((file) => file.path === exeRelativePath);
const legacyExecutable = files.find((file) => file.path.toLowerCase() === 'game.exe');
if (legacyExecutable) {
  throw new Error(`Forbidden legacy Steam payload executable listed in payload: ${legacyExecutable.path}`);
}
const manifestHash = createHash('sha256')
  .update(files.map((file) => `${file.path}\t${file.bytes}\t${file.sha256}`).join('\n'))
  .digest('hex');

const manifest = {
  generatedAt: new Date().toISOString(),
  build: {
    version: version.version || null,
    timestamp: version.timestamp || null
  },
  contentRoot: rel(contentRoot),
  executable,
  fileCount: files.length,
  totalBytes,
  manifestHash,
  files
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`[steam-payload-manifest] wrote ${rel(outputPath)} (${files.length} files, ${totalBytes} bytes)`);
