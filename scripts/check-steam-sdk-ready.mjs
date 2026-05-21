import { existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const outputDir = path.resolve(root, 'test-results', `steam-sdk-ready-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function candidateSdkRoots() {
  return [
    process.env.NOVA_SWARM_STEAMWORKS_SDK_PATH,
    process.env.STEAMWORKS_SDK_PATH,
    path.join(root, 'steam_sdk', 'sdk'),
    path.join(root, 'steamworks_sdk')
  ].filter(Boolean);
}

function requiredFilesFor(sdkRoot) {
  return [
    path.join(sdkRoot, 'redistributable_bin', 'steam_api.dll'),
    path.join(sdkRoot, 'redistributable_bin', 'win64', 'steam_api64.dll')
  ];
}

function findSdkRoot() {
  return candidateSdkRoots().find((candidate) => requiredFilesFor(candidate).every(file => existsSync(file))) || null;
}

function optionalDependencyInstalled() {
  try {
    require.resolve('steamworks-ffi-node');
    return true;
  } catch {
    return false;
  }
}

const sdkRoot = findSdkRoot();
const report = {
  status: 'pending',
  sdkRoot,
  checkedRoots: candidateSdkRoots(),
  requiredFiles: sdkRoot ? requiredFilesFor(sdkRoot).map(file => ({
    path: path.relative(root, file).replace(/\\/g, '/'),
    bytes: statSync(file).size
  })) : [],
  optionalDependencyInstalled: optionalDependencyInstalled(),
  package: 'steamworks-ffi-node',
  nextSteps: []
};

const errors = [];
if (!sdkRoot) {
  errors.push('Missing Steamworks SDK redistributables. Expected steam_sdk/sdk/redistributable_bin/steam_api.dll and steam_sdk/sdk/redistributable_bin/win64/steam_api64.dll.');
  report.nextSteps.push('Place the official Steamworks SDK at steam_sdk/sdk/ or set NOVA_SWARM_STEAMWORKS_SDK_PATH to the SDK root.');
}
if (!report.optionalDependencyInstalled) {
  report.nextSteps.push('Run npm install so optional dependency steamworks-ffi-node is present for the native Electron bridge.');
}

report.status = errors.length ? 'failed' : 'passed';
report.errors = errors;
mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (errors.length) {
  console.error(`[steam-sdk-ready] FAIL ${errors.join('; ')} report=${path.join(outputDir, 'report.json')}`);
  process.exitCode = 1;
} else {
  const dependencyNote = report.optionalDependencyInstalled ? 'steamworks-ffi-node installed' : 'steamworks-ffi-node not installed yet';
  console.log(`[steam-sdk-ready] PASS sdk=${path.relative(root, sdkRoot)} ${dependencyNote} report=${path.join(outputDir, 'report.json')}`);
}
