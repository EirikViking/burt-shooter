import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4355));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/how-to-play-${timestamp()}`);
const scenarios = [
  { name: '1280x720-windowed', width: 1280, height: 720, scale: 1 },
  { name: '760x640-windowed', width: 760, height: 640, scale: 1 },
  { name: '1920x1080-scale100', width: 1920, height: 1080, scale: 1 },
  { name: '1920x1080-scale150', width: 1920, height: 1080, scale: 1.5 },
  { name: '1920x1080-scale175', width: 1920, height: 1080, scale: 1.75 },
  { name: '1920x1080-scale200', width: 1920, height: 1080, scale: 2 },
  { name: '3840x2160-scale100', width: 3840, height: 2160, scale: 1 },
  { name: '3840x2160-scale150', width: 3840, height: 2160, scale: 1.5 },
  { name: '3840x2160-scale175', width: 3840, height: 2160, scale: 1.75 },
  { name: '3840x2160-scale200', width: 3840, height: 2160, scale: 2 }
];
const expectedRows = {
  flight: ['MOVE', 'FOCUS DRIFT', 'SHOOT', 'DODGE / PHASE'],
  combat: ['CHAINED DODGE', 'GRAZE', 'GRAZE BREAK', 'COMBOS', 'TRACTOR SHIPS', 'PICKUPS & BONUS'],
  modes: ['DAILY CHALLENGE', 'MAYHEM PURE', 'MAYHEM TACTICAL', 'SCOUT RUN', 'SECTOR RUN'],
  tactics: ['SIDE DIRECTIVES', 'TACTICAL DRAFT', 'FUSION PROTOCOLS', 'SCORE ROUTE & BANS', 'DRAFT TOOLS', 'POWERUP OVERLAP', 'STACK LIMITS', 'THREAT RESPONSE'],
  intel: ['ACE BOUNTIES', 'EXTINCTION-CLASS CONTACT', 'ELITE SIGNALS', 'CABINET SKILL FLIGHT', 'BOSS WAVES'],
  career: ['PILOT ORDERS', 'SHIP HANGAR', 'THREAT CODEX', 'RECORDS & LEADERBOARDS']
};

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, value);
  return next.toString();
}

async function isPortAvailable(candidatePort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(candidatePort, host);
  });
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available check port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Preview server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForState(page, predicate, label, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await readState(page);
    if (predicate(latest)) return latest;
    await page.waitForTimeout(100);
  }
  throw new Error(`${label} timed out. Last state: ${JSON.stringify({
    scene: latest?.scene,
    overlays: latest?.overlays,
    menu: latest?.menu?.focusedOption,
    howToPlay: latest?.howToPlayOverlay
  })}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertCleanHelpCopy(state, label, expectedPage = state.howToPlayOverlay?.pageId) {
  const rows = state.howToPlayOverlay?.rows || [];
  const joined = JSON.stringify(state.howToPlayOverlay || {});
  assert(state.howToPlayOverlay?.pageId === expectedPage, `${label} expected ${expectedPage} page, saw ${state.howToPlayOverlay?.pageId}`);
  for (const row of expectedRows[expectedPage] || []) {
    assert(rows.includes(row), `${label} missing ${row}`);
  }
  assert(!rows.includes('DODGE'), `${label} still labels the phase protection as DODGE`);
  assert(!rows.includes('NEAR MISSES'), `${label} still uses the old NEAR MISSES card label`);
  assert(!rows.includes('TRACTOR BEAMS'), `${label} still uses the old TRACTOR BEAMS card label`);
  if (expectedPage === 'flight') {
    assert(joined.includes('HOLD CTRL / LT'), `${label} should mention the Focus Drift input`);
    assert(joined.includes('tight weaving'), `${label} should explain Focus Drift movement use`);
    assert(joined.includes('SPACE / LEFT MOUSE / GAMEPAD A'), `${label} should mention left mouse shooting`);
    assert(joined.includes('LEFT/RIGHT SHIFT / GAMEPAD B'), `${label} should mention both Shift keys for Phase Burst`);
  }
  if (expectedPage === 'combat') {
    assert(joined.includes('3 GRAZES ARM YOUR NEXT SHOT'), `${label} should explain Graze Break arming`);
    assert(joined.includes('Danger Dodge achievements'), `${label} should connect chained dodges to achievements`);
    assert(joined.includes('fire the charged magenta shot into enemy fire'), `${label} should explain how to spend Graze Break`);
  }
  if (expectedPage === 'modes') {
    assert(joined.includes('CLEAR S10 // BEAT YOUR BEST'), `${label} should explain the Daily Challenge goal`);
    assert(joined.includes('personal score mission'), `${label} should explain the purpose of the Daily Challenge`);
    assert(joined.includes('there is no public Daily leaderboard yet'), `${label} should explain why the Daily result is still local`);
    assert(joined.includes('RANKED // NO TACTICAL UPGRADES'), `${label} should identify Mayhem Pure as ranked raw skill`);
    assert(joined.includes('RANKED // BOSS DRAFTS ACTIVE'), `${label} should identify Mayhem Tactical as ranked buildcraft`);
    assert(joined.includes('No leaderboard submission, achievements, career XP, Pilot Orders, or checkpoint unlocks'), `${label} should explain Scout progression limits`);
    assert(joined.includes('separate Steam Sector leaderboard'), `${label} should explain the Sector Run leaderboard lane`);
    assert(joined.includes('career and achievements stay untouched'), `${label} should explain Sector Run progression limits`);
  }
  if (expectedPage === 'tactics') {
    assert(joined.includes('AFTER EACH BOSS: CHOOSE 1 OF 3'), `${label} should explain when Tactical Draft appears`);
    assert(joined.includes('OWN BOTH LISTED AUGMENTS // NO SCORE MULTIPLIER'), `${label} should explain how Fusion Protocols unlock without changing score rules`);
    assert(joined.includes('never adds a score multiplier'), `${label} should explain Fusion Protocol score fairness`);
    assert(joined.includes('SECTOR 5 SCORE CHOICE // 2 PERMANENT BANS'), `${label} should explain the fixed score choice and two bans`);
    assert(joined.includes('Combo Anchor is always offered'), `${label} should explain score-route fairness`);
    assert(joined.includes('R / GAMEPAD Y: RESCAN ONCE // L / GAMEPAD X: HOLD ONE'), `${label} should explain both Draft agency tools`);
    assert(joined.includes('taking the held card consumes it'), `${label} should explain how Rescan and Hold remain bounded`);
    assert(joined.includes('SAME NAME: TIMED PICKUP TAKES PRIORITY'), `${label} should explain ordinary pickup priority`);
    assert(joined.includes('STACK I 100% // II 55% // III 30%'), `${label} should explain all three stack values`);
    assert(joined.includes('Sixteen repeatable augments can reach Stack III'), `${label} should explain Tactical evolution and Overdrive identities`);
    assert(joined.includes('capped at +45%'), `${label} should explain the direct Draft output cap`);
    assert(joined.includes('preserves a meaningful power advantage'), `${label} should explain that Threat Response preserves hull progression`);
  }
  if (expectedPage === 'intel') {
    assert(joined.includes('1000 ACES + 10000 PROTOCOLS + 10000 WINGS'), `${label} should explain all three encounter catalogs`);
    assert(joined.includes('without adding enemies or score'), `${label} should explain score-safe Rival Wings`);
    assert(joined.includes('0.4% WAVE CONTACT'), `${label} should identify the true Extinction Contact rarity`);
    assert(joined.includes('50 ELITES // READ SHAPE, COLOR, SOUND'), `${label} should explain the full elite roster and warning language`);
    assert(joined.includes('misses do not break no-hit status'), `${label} should explain Skill Flight safety`);
  }
  if (expectedPage === 'career') {
    assert(joined.includes('OPTIONAL MAYHEM DRILLS'), `${label} should explain Pilot Orders`);
    assert(joined.includes('CAREER XP // HULLS, TRAITS, LOADOUTS'), `${label} should explain Hangar progression`);
    assert(joined.includes('DISCOVERIES // PATTERNS // COUNTERS'), `${label} should explain Codex intel`);
    assert(joined.includes('PURE + TACTICAL + SECTOR STEAM'), `${label} should distinguish the three Steam leaderboard lanes`);
    assert(joined.includes('Daily Signal keeps a local UTC record'), `${label} should explain the local Daily record lane`);
  }
  assert(!joined.includes('Most augments cap at two stacks'), `${label} still contains the obsolete two-stack limit`);
  assert(!joined.includes('hijack enemies'), `${label} should not promise visible enemy hijacking`);
  for (const oldPhrase of ['doorbell', 'paperwork', 'spicy geometry', 'training wheels', 'legal theft']) {
    assert(!joined.includes(oldPhrase), `${label} still contains old joke copy: ${oldPhrase}`);
  }
}

function assertScreenshotAudit(audit, label) {
  assert(!audit.failures?.length, `${label} screenshot audit failures: ${(audit.failures || []).join('; ')}`);
}

function assertOverlayLayout(state, label) {
  const overlay = state.howToPlayOverlay;
  const layout = overlay?.layout;
  const expectedCount = expectedRows[overlay?.pageId]?.length || 0;
  assert(overlay?.pages?.length === 6, `${label} expected six help pages`);
  assert(overlay?.cardCount === expectedCount, `${label} expected ${expectedCount} help cards, saw ${overlay?.cardCount}`);
  assert(overlay?.heroArt?.motionNodes >= 20, `${label} expected animated hero art nodes, saw ${overlay?.heroArt?.motionNodes}`);
  assert(overlay?.heroArt?.textureSprites >= 6, `${label} expected real hero texture slots, saw ${overlay?.heroArt?.textureSprites}`);
  assert(overlay?.heroArt?.visibleTextureSprites >= 4, `${label} expected loaded hero art sprites, saw ${overlay?.heroArt?.visibleTextureSprites}`);
  assert(layout?.cards?.length === overlay.cardCount, `${label} card layout count mismatch`);
  assert(!layout.layoutWarnings?.length, `${label} layout warnings: ${(layout.layoutWarnings || []).join('; ')}`);
  assert(layout.panel?.width > 500 && layout.panel?.height > 420, `${label} panel too small`);
  assert(layout.footer?.y > Math.max(...layout.cards.map((card) => card.y + card.height)), `${label} footer overlaps card grid`);
  assert(layout.button?.y >= layout.footer?.y, `${label} back button escaped footer rail`);
  for (const card of layout.cards) {
    assert(card.x >= -2 && card.y >= -2, `${label} card ${card.label} escaped top/left bounds`);
    assert(card.x + card.width <= layout.panel.x + layout.panel.width + 2, `${label} card ${card.label} escaped right panel bounds`);
    assert(card.y + card.height <= layout.footer.y + 2, `${label} card ${card.label} escaped bottom panel bounds`);
  }
}

async function screenshotWithAudit(page, scenarioDir, name) {
  const file = path.join(scenarioDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const audit = await page.evaluate(() => {
    const width = window.__game?.getWidth?.() || window.innerWidth;
    const height = window.__game?.getHeight?.() || window.innerHeight;
    const failures = [];
    const samples = [];
    const seen = new Set();
    const visit = (node) => {
      if (!node || seen.has(node)) return;
      seen.add(node);
      if (node.visible === false || node.renderable === false || node.alpha === 0) return;
      const isText = node.constructor?.name === 'Text';
      if (isText) {
        const text = String(node.text ?? '');
        if (/NaN|undefined|null/.test(text)) failures.push(`bad text "${text}"`);
        try {
          const rect = node.getBounds?.();
          if (rect && rect.width > 0 && rect.height > 0) {
            const bounds = {
              text: text.slice(0, 80),
              x: Math.round(rect.x || 0),
              y: Math.round(rect.y || 0),
              right: Math.round((rect.x || 0) + (rect.width || 0)),
              bottom: Math.round((rect.y || 0) + (rect.height || 0))
            };
            if (bounds.right < -20 || bounds.bottom < -20 || bounds.x > width + 20 || bounds.y > height + 20) {
              failures.push(`text outside viewport ${JSON.stringify(bounds)}`);
            }
            if (samples.length < 80) samples.push(bounds);
          }
        } catch {
          failures.push(`unable to measure text "${text.slice(0, 40)}"`);
        }
      }
      for (const child of node.children || []) visit(child);
    };
    visit(window.__game?.currentScene?.container);
    visit(window.__game?.scenes?.play?.uiOverlay);
    return { width, height, failures, samples };
  });
  assertScreenshotAudit(audit, `${name}`);
  return { file, audit };
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  mkdirSync(outputDir, { recursive: true });
  const scenariosReport = [];
  for (const scenario of scenarios) {
    const scenarioDir = path.join(outputDir, scenario.name);
    mkdirSync(scenarioDir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height } });
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.addInitScript((next) => {
      window.localStorage?.setItem?.('nova_ui_scale_v1', String(next.scale));
      window.localStorage?.setItem?.('nova_display_mode_v1', 'windowed');
      window.localStorage?.setItem?.('nova_display_window_size_v1', JSON.stringify({
        width: next.width,
        height: next.height
      }));
    }, scenario);

    try {
      await page.goto(withQuery(baseUrl, { skipIntro: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
      const menu = await waitForState(page, (state) => state.scene === 'menu' && state.menu?.focusedOption, `${scenario.name} menu ready`);
      assert(Number(menu.display?.uiScale) === scenario.scale, `${scenario.name} display uiScale mismatch: ${menu.display?.uiScale}`);
      assert(Number(menu.layout?.uiScale) === scenario.scale, `${scenario.name} layout uiScale mismatch: ${menu.layout?.uiScale}`);
      assert(menu.menu?.optionOrder?.includes('howToPlay'), `${scenario.name} main menu controller order does not include How To Play`);
      assert(menu.menu?.items?.helpButton?.width > 80, `${scenario.name} How To Play menu button is missing or too small`);

      await page.evaluate(() => window.__game?.currentScene?.openHowToPlayOverlay?.());
      const menuHelp = await waitForState(
        page,
        (state) => state.overlays?.howToPlay &&
          state.howToPlayOverlay?.rows?.length >= 4 &&
          state.howToPlayOverlay?.heroArt?.visibleTextureSprites >= 4,
        `${scenario.name} menu help overlay`
      );
      assertOverlayLayout(menuHelp, `${scenario.name} menu help overlay`);
      assertCleanHelpCopy(menuHelp, `${scenario.name} menu help overlay`, 'flight');
      const firstHelpCard = menuHelp.howToPlayOverlay.layout.cards[0];
      if (scenario.name === '1280x720-windowed') {
        await page.waitForTimeout(180);
        await page.mouse.click(firstHelpCard.x + firstHelpCard.width / 2, firstHelpCard.y + firstHelpCard.height / 2);
      } else {
        await page.keyboard.press('Enter');
      }
      const menuDetail = await waitForState(page, (state) => Boolean(state.howToPlayOverlay?.detail), `${scenario.name} menu detail open`);
      assert(menuDetail.howToPlayOverlay.detail.label === 'MOVE', `${scenario.name} pointer opened the wrong help detail`);
      assert(String(menuDetail.howToPlayOverlay.detail.detail || '').length > 120, `${scenario.name} help detail is too shallow`);
      assert(!/as an ai|language model/i.test(menuDetail.howToPlayOverlay.detail.detail), `${scenario.name} help detail broke Nova Swarm voice`);
      const menuDetailShot = await screenshotWithAudit(page, scenarioDir, 'menu-how-to-play-detail');
      await page.keyboard.press('Escape');
      await waitForState(page, (state) => state.overlays?.howToPlay && !state.howToPlayOverlay?.detail, `${scenario.name} menu detail closed`);
      await page.keyboard.press('ArrowRight');
      const menuCombat = await waitForState(page, (state) => state.howToPlayOverlay?.pageId === 'combat', `${scenario.name} menu combat page`);
      assertOverlayLayout(menuCombat, `${scenario.name} menu combat page`);
      assertCleanHelpCopy(menuCombat, `${scenario.name} menu combat page`, 'combat');
      await page.keyboard.press('ArrowRight');
      const menuModes = await waitForState(page, (state) => state.howToPlayOverlay?.pageId === 'modes', `${scenario.name} menu modes page`);
      assertOverlayLayout(menuModes, `${scenario.name} menu modes page`);
      assertCleanHelpCopy(menuModes, `${scenario.name} menu modes page`, 'modes');
      await page.keyboard.press('ArrowRight');
      const menuTactics = await waitForState(page, (state) => state.howToPlayOverlay?.pageId === 'tactics', `${scenario.name} menu tactics page`);
      assertOverlayLayout(menuTactics, `${scenario.name} menu tactics page`);
      assertCleanHelpCopy(menuTactics, `${scenario.name} menu tactics page`, 'tactics');
      const menuTacticsShot = await screenshotWithAudit(page, scenarioDir, 'menu-how-to-play-tactics');
      await page.keyboard.press('ArrowRight');
      const menuIntel = await waitForState(page, (state) => state.howToPlayOverlay?.pageId === 'intel', `${scenario.name} menu intel page`);
      assertOverlayLayout(menuIntel, `${scenario.name} menu intel page`);
      assertCleanHelpCopy(menuIntel, `${scenario.name} menu intel page`, 'intel');
      await page.keyboard.press('ArrowRight');
      const menuCareer = await waitForState(page, (state) => state.howToPlayOverlay?.pageId === 'career', `${scenario.name} menu career page`);
      assertOverlayLayout(menuCareer, `${scenario.name} menu career page`);
      assertCleanHelpCopy(menuCareer, `${scenario.name} menu career page`, 'career');
      const menuShot = await screenshotWithAudit(page, scenarioDir, 'menu-how-to-play');
      if (scenario.name === '1280x720-windowed') {
        for (const locale of ['de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']) {
          await page.evaluate((code) => window.__novaI18n?.setLanguagePreference?.(code), locale);
          await page.waitForTimeout(90);
          for (const [pageIndex, pageId] of [[2, 'modes'], [3, 'tactics'], [4, 'intel'], [5, 'career']]) {
            await page.evaluate((index) => window.__game?.currentScene?.howToPlayOverlay?.setPage?.(index), pageIndex);
            const localized = await waitForState(page, (state) => state.howToPlayOverlay?.pageId === pageId, `${locale} localized ${pageId} page`);
            assertOverlayLayout(localized, `${locale} localized ${pageId} page`);
            assertCleanHelpCopy(localized, `${locale} localized ${pageId} page`, pageId);
            for (const card of localized.howToPlayOverlay?.cards || []) {
              assert(card.translatedControl !== card.control, `${locale} left How To Play control in English: ${card.control}`);
              assert(card.translatedTip !== card.tip, `${locale} left How To Play tip in English: ${card.tip}`);
            }
            await page.keyboard.press('Enter');
            const localizedDetail = await waitForState(page, (state) => Boolean(state.howToPlayOverlay?.detail), `${locale} localized ${pageId} detail open`);
            assert(localizedDetail.howToPlayOverlay.detail.translatedDetail !== localizedDetail.howToPlayOverlay.detail.detail,
              `${locale} left detailed ${pageId} How To Play copy in English`);
            await page.keyboard.press('Escape');
            await waitForState(page, (state) => !state.howToPlayOverlay?.detail, `${locale} localized ${pageId} detail closed`);
          }
          if (['de', 'ru', 'zh-CN', 'ja'].includes(locale)) {
            await screenshotWithAudit(page, scenarioDir, `menu-how-to-play-career-${locale.replace('-', '_')}`);
          }
        }
        await page.evaluate(() => window.__novaI18n?.setLanguagePreference?.('en'));
        await page.waitForTimeout(90);
      }
      await page.keyboard.press('Escape');
      await waitForState(page, (state) => state.scene === 'menu' && !state.overlays?.howToPlay, `${scenario.name} menu help closed`);

      await page.goto(withQuery(baseUrl, { autostart: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForState(page, (state) => state.scene === 'play' && state.lives > 0, `${scenario.name} play ready`);
      const inputProof = await page.evaluate(() => {
        const play = window.__game?.scenes?.play;
        const input = play?.inputManager;
        const player = play?.player;
        if (!play || !input || !player) return { ok: false, reason: 'missing_play_input_or_player' };
        const wasTouchFireActive = input.touchFireActive;
        input.touchFireActive = true;
        const leftMouseFires = Boolean(input.isFiring?.());
        input.touchFireActive = wasTouchFireActive;
        const oldKeys = { ...(input.keys || {}) };
        const oldTouchInput = { ...(player.touchInput || {}) };
        const oldDriftVelocity = { ...(player.statusDriftVelocity || {}) };
        const oldFocusDriftActive = player.focusDriftActive;
        const oldX = player.x;
        const oldY = player.y;
        const measureMovement = (withFocus) => {
          input.keys = {};
          input.setKeyPressed?.('ArrowRight', true);
          if (withFocus) input.setKeyPressed?.('ControlLeft', true);
          player.touchInput = { moveX: 0, moveY: 0 };
          if (player.statusDriftVelocity) {
            player.statusDriftVelocity.x = 0;
            player.statusDriftVelocity.y = 0;
          }
          player.x = Math.max(120, Math.min((play.game?.getWidth?.() || 1280) - 120, oldX));
          player.y = Math.max(120, Math.min((play.game?.getHeight?.() || 720) - 140, oldY));
          const before = player.x;
          player.update(1);
          const moved = player.x - before;
          return { moved, focusDriftActive: Boolean(player.focusDriftActive) };
        };
        const normalMove = measureMovement(false);
        const focusMove = measureMovement(true);
        input.keys = oldKeys;
        player.touchInput = oldTouchInput;
        player.statusDriftVelocity = oldDriftVelocity;
        player.focusDriftActive = oldFocusDriftActive;
        player.x = oldX;
        player.y = oldY;
        if (player.sprite) {
          player.sprite.x = oldX;
          player.sprite.y = oldY;
        }

        const oldGamepadOverride = window.__burtGamepadOverride;
        const focusButtons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
        focusButtons[6] = { pressed: true, value: 1 };
        window.__burtGamepadOverride = {
          id: 'focus-proof-gamepad',
          axes: [0, 0, 0, 0],
          buttons: focusButtons,
          connected: true
        };
        const leftTriggerFocus = Boolean(input.isKeyPressed?.('focus'));
        window.__burtGamepadOverride = oldGamepadOverride;
        input.pollGamepad?.(true);

        const oldOverride = window.__burtKeyboardOverride;
        const oldDodging = player.isDodging;
        const oldDodgeCooldown = player.dodgeCooldown;
        const oldDodgeDuration = player.dodgeDuration;
        const oldDodgeFlashMs = player.dodgeFlashMs;
        const oldInvulnerable = player.invulnerable;
        window.__burtKeyboardOverride = { ShiftRight: true };
        player.isDodging = false;
        player.dodgeCooldown = 0;
        player.dodgeDuration = 0;
        player.dodgeFlashMs = 0;
        player.invulnerable = false;
        player.update(1);
        const rightShiftStartsPhase = Boolean(player.isDodging && player.invulnerable && player.dodgeDuration > 0);
        player.isDodging = oldDodging;
        player.dodgeCooldown = oldDodgeCooldown;
        player.dodgeDuration = oldDodgeDuration;
        player.dodgeFlashMs = oldDodgeFlashMs;
        player.invulnerable = oldInvulnerable;
        if (player.dodgeText) player.dodgeText.visible = false;
        if (player.dodgeRing) player.dodgeRing.visible = false;
        if (player.sprite) player.sprite.alpha = 1;
        window.__burtKeyboardOverride = oldOverride;
        const focusSlowsMovement = normalMove.moved > 0 &&
          focusMove.moved > 0 &&
          focusMove.moved < normalMove.moved * 0.7 &&
          focusMove.focusDriftActive;
        return {
          ok: leftMouseFires && rightShiftStartsPhase && focusSlowsMovement && leftTriggerFocus,
          leftMouseFires,
          rightShiftStartsPhase,
          focusSlowsMovement,
          leftTriggerFocus,
          normalMove,
          focusMove
        };
      });
      assert(inputProof.ok, `${scenario.name} input proof failed: ${JSON.stringify(inputProof)}`);
      await page.evaluate(() => {
        const play = window.__game?.scenes?.play;
        play?.setPaused?.(true);
        play?.openHowToPlayOverlay?.();
      });
      const pauseHelp = await waitForState(
        page,
        (state) => state.scene === 'play' &&
          state.isPaused &&
          state.overlays?.pause &&
          state.overlays?.howToPlay &&
          state.howToPlayOverlay?.heroArt?.visibleTextureSprites >= 4,
        `${scenario.name} pause help overlay`
      );
      assertOverlayLayout(pauseHelp, `${scenario.name} pause help overlay`);
      assertCleanHelpCopy(pauseHelp, `${scenario.name} pause help overlay`, 'flight');
      await page.evaluate(() => window.__game?.scenes?.play?.howToPlayOverlay?.setPage?.(5));
      const pauseCareer = await waitForState(page, (state) => state.howToPlayOverlay?.pageId === 'career', `${scenario.name} pause career page`);
      assertOverlayLayout(pauseCareer, `${scenario.name} pause career page`);
      assertCleanHelpCopy(pauseCareer, `${scenario.name} pause career page`, 'career');
      const pauseShot = await screenshotWithAudit(page, scenarioDir, 'pause-how-to-play');

      scenariosReport.push({
        ...scenario,
        ok: pageErrors.length === 0 && consoleErrors.length === 0,
        menuRows: menuCareer.howToPlayOverlay?.rows,
        menuDetail: menuDetail.howToPlayOverlay?.detail,
        menuDetailShot,
        pauseRows: pauseCareer.howToPlayOverlay?.rows,
        menuLayout: menuCareer.howToPlayOverlay?.layout,
        pauseLayout: pauseCareer.howToPlayOverlay?.layout,
        screenshots: {
          menu: menuShot.file,
          tactics: menuTacticsShot.file,
          pause: pauseShot.file
        },
        audits: {
          menu: menuShot.audit,
          tactics: menuTacticsShot.audit,
          pause: pauseShot.audit
        },
        pageErrors,
        consoleErrors
      });
      assert(pageErrors.length === 0 && consoleErrors.length === 0, `${scenario.name} browser diagnostics failed`);
    } finally {
      await page.close();
    }
  }
  const report = {
    ok: scenariosReport.every((scenario) => scenario.ok),
    baseUrl,
    scenarios: scenariosReport
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `Help overlay diagnostics failed: ${JSON.stringify(report)}`);
  console.log(`[how-to-play] PASS scenarios=${scenariosReport.length} report=${path.join(outputDir, 'report.json')}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
