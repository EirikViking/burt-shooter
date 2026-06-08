import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/controller-full-flow-${timestamp()}`);
const reportPath = path.join(outputDir, 'report.json');
const errors = [];
const checks = [];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function read(relativePath) {
  return readFileSync(path.resolve(root, relativePath), 'utf8');
}

function expectText(file, needle, label) {
  const ok = read(file).includes(needle);
  checks.push({ label, file, ok });
  if (!ok) errors.push(`${label} missing from ${file}`);
}

function expectRegex(file, regex, label) {
  const ok = regex.test(read(file));
  checks.push({ label, file, ok });
  if (!ok) errors.push(`${label} missing from ${file}`);
}

function runNodeScript(script, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

mkdirSync(outputDir, { recursive: true });

expectText('scripts/check-controller-only-flow.mjs', "steerMenuTo(page, 'settings')", 'main menu to settings controller route');
expectText('scripts/check-controller-only-flow.mjs', "steerMenuTo(page, 'hangar')", 'main menu to Hangar controller route');
expectText('scripts/check-controller-only-flow.mjs', "steerMenuTo(page, 'threatCodex')", 'Codex controller route');
expectText('scripts/check-controller-only-flow.mjs', "state.scene === 'threatCodex'", 'Codex runtime scene assertion');
expectText('scripts/check-controller-only-flow.mjs', "steerMenuTo(page, 'achievements')", 'achievements controller route');
expectText('scripts/check-controller-only-flow.mjs', 'ship select right navigation', 'Hangar ship movement runtime assertion');
expectText('scripts/check-controller-only-flow.mjs', 'ship details opened by controller X', 'legacy controller Details shortcut assertion');
expectText('scripts/check-controller-only-flow.mjs', 'gameplay launched by controller', 'controller launch/start assertion');
expectText('scripts/check-controller-only-flow.mjs', 'pause opened by controller Start', 'pause controller assertion');
expectText('scripts/check-controller-only-flow.mjs', 'game resumed by controller B', 'resume controller assertion');
expectText('scripts/check-controller-only-flow.mjs', 'controller disconnect auto-paused gameplay', 'controller disconnect pause guard');
expectText('scripts/check-controller-only-flow.mjs', 'controller initials entry', 'game over controller initials assertion');
expectText('scripts/check-controller-only-flow.mjs', 'submitted score continued to runback by controller A', 'result/runback controller assertion');
expectText('scripts/check-controller-only-flow.mjs', 'highscores opened by controller Y', 'leaderboard controller assertion');

expectText('scripts/check-hangar-controller-details.mjs', 'controller focused visible Details action', 'visible Details action focus assertion');
expectText('scripts/check-hangar-controller-details.mjs', 'controller A opened Details for focused ship', 'visible Details A activation assertion');
expectText('scripts/check-hangar-controller-details.mjs', 'controller B closed Details back to predictable ship focus', 'Details close focus assertion');
expectText('scripts/check-hangar-controller-details.mjs', 'controller cycled action focus to Start', 'Hangar action-row no-trap assertion');
expectText('scripts/check-hangar-controller-details.mjs', 'controller equipped/launched selected ship', 'Hangar focused Start launch assertion');

expectRegex('scripts/check-overrun-milestones.mjs', /control:\s*'gamepad'/, 'Overrun milestone gamepad test cases');
expectText('scripts/check-overrun-milestones.mjs', 'confirmedBy === control', 'Overrun milestone confirmation source assertion');
expectText('scripts/check-overrun-milestones.mjs', "testCase.control === 'gamepad'", 'Overrun milestone gamepad release path');

expectText('src/input/GamepadNavigator.js', 'confirm: isPressed(buttons, 0)', 'Xbox A confirm mapping');
expectText('src/input/GamepadNavigator.js', 'cancel: isPressed(buttons, 1)', 'Xbox B cancel mapping');
expectText('src/input/GamepadNavigator.js', 'x: isPressed(buttons, 2)', 'Xbox X mapping');
expectText('src/input/GamepadNavigator.js', 'y: isPressed(buttons, 3)', 'Xbox Y mapping');
expectText('src/input/GamepadNavigator.js', 'menu: isPressed(buttons, 9)', 'Xbox menu/start mapping');
expectText('src/scenes/ShipSelectScene.js', "this.activateControllerFocus('controller')", 'Hangar confirm uses focused controller action');
expectText('src/scenes/ShipSelectScene.js', "this.setControllerFocus('ship')", 'Hangar can return to ship-card focus');
expectText('src/scenes/ShipSelectScene.js', "e.key === 'Enter'", 'Hangar keyboard fallback retained');
expectText('src/scenes/ShipDetailsScene.js', 'if (nav.pressed.cancel || nav.pressed.back || nav.pressed.menu) this.goBack();', 'Details close via controller retained');
expectText('package.json', '"check:keyboard-launches"', 'keyboard fallback guard remains available');

let overrunResult = null;
if (errors.length === 0) {
  const overrunOutput = path.join(outputDir, 'overrun-milestones');
  overrunResult = await runNodeScript('scripts/check-overrun-milestones.mjs', { CHECK_OUTPUT_DIR: overrunOutput });
  checks.push({
    label: 'Overrun milestone controller confirmation runtime',
    file: 'scripts/check-overrun-milestones.mjs',
    ok: overrunResult.code === 0,
    outputDir: rel(overrunOutput)
  });
  if (overrunResult.code !== 0) {
    errors.push(`Overrun milestone controller confirmation failed with exit code ${overrunResult.code}`);
  }
}

const protectedFiles = [
  'src/config/DifficultyTuning.js',
  'src/config/EnemyWaves.js',
  'src/config/BossConfigs.js',
  'src/config/PowerupBalance.js',
  'src/leaderboard/LeaderboardTypes.js',
  'electron/steamLeaderboardBridge.cjs',
  'release/steamworks/store_metadata_draft.json'
].map((file) => ({ file, exists: existsSync(path.resolve(root, file)) }));

const report = {
  ok: errors.length === 0,
  outputDir: rel(outputDir),
  checks,
  protectedFilesObservedOnly: protectedFiles,
  overrunResult: overrunResult ? {
    code: overrunResult.code,
    stdoutTail: overrunResult.stdout.slice(-2000),
    stderrTail: overrunResult.stderr.slice(-2000)
  } : null,
  errors
};
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (errors.length) {
  console.error(`[controller-full-flow] FAIL ${errors.join('; ')} report=${rel(reportPath)}`);
  process.exit(1);
}

console.log(`[controller-full-flow] PASS report=${rel(reportPath)}`);
