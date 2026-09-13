import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4746));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || 'test-results/menu-overlap-audit');
const auditUiScale = Math.max(1, Math.min(2, Number(process.env.CHECK_UI_SCALE) || 1));
const auditLanguage = String(process.env.CHECK_LANGUAGE || 'en').trim() || 'en';
const settingsOnly = process.env.CHECK_SETTINGS_ONLY === '1';
const scaleTag = `scale-${String(auditUiScale).replace('.', '_')}`;
const languageTag = auditLanguage.replace(/[^a-z0-9_-]+/gi, '_');
const allViewports = [
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'supported-1280', width: 1280, height: 720 },
  { name: 'supported-960', width: 960, height: 640 }
];
const requestedViewport = String(process.env.CHECK_VIEWPORT || '').trim();
const viewports = requestedViewport
  ? allViewports.filter((viewport) => viewport.name === requestedViewport)
  : allViewports;
assert.ok(viewports.length > 0, `Unknown CHECK_VIEWPORT: ${requestedViewport}`);
const chromePath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].filter(Boolean).find(existsSync);

mkdirSync(outputDir, { recursive: true });

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
  throw new Error(`No available menu overlap audit port found starting at ${startPort}`);
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

async function startDevServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
}

function contains(outer, inner, padding = 0) {
  if (!outer || !inner) return false;
  const outerRight = Number.isFinite(outer.right) ? outer.right : outer.x + outer.width;
  const outerBottom = Number.isFinite(outer.bottom) ? outer.bottom : outer.y + outer.height;
  const innerRight = Number.isFinite(inner.right) ? inner.right : inner.x + inner.width;
  const innerBottom = Number.isFinite(inner.bottom) ? inner.bottom : inner.y + inner.height;
  return inner.x >= outer.x + padding &&
    inner.y >= outer.y + padding &&
    innerRight <= outerRight - padding &&
    innerBottom <= outerBottom - padding;
}

function intersects(a, b, gap = 0) {
  if (!a || !b) return false;
  return a.x < b.right + gap && a.right + gap > b.x && a.y < b.bottom + gap && a.bottom + gap > b.y;
}

function textInkBounds(bounds, padding = 0) {
  if (!bounds) return null;
  const inset = Math.max(0, Math.min(Number(padding) || 0, bounds.width / 2, bounds.height / 2));
  return {
    x: bounds.x + inset,
    y: bounds.y + inset,
    width: Math.max(0, bounds.width - inset * 2),
    height: Math.max(0, bounds.height - inset * 2),
    right: bounds.right - inset,
    bottom: bounds.bottom - inset
  };
}

function assertTextInside(frame, text, label, padding = 6) {
  assert.ok(frame && text, `${label}: missing measurable bounds`);
  assert.ok(contains(frame, text, padding), `${label}: text touches or crosses frame: ${JSON.stringify({ frame, text })}`);
}

async function seed(page) {
  await page.addInitScript(({ language }) => {
    const progressed = new URL(window.location.href).searchParams.get('auditProfile') === 'progressed';
    const uiScale = Math.max(1, Math.min(2, Number(new URL(window.location.href).searchParams.get('auditScale')) || 1));
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', language);
    localStorage.setItem('nova_ui_scale_v1', String(uiScale));
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      totalRuns: progressed ? 64 : 0,
      bestScore: progressed ? 420000 : 0,
      bestSector: progressed ? 60 : 1,
      bestLevel: progressed ? 60 : 1,
      totalBossesDefeated: progressed ? 72 : 0,
      totalWavesCleared: progressed ? 360 : 0
    }));
  }, { language: auditLanguage });
}

function assertLaneSequence(bounds, label, gap = 4) {
  const lanes = bounds.filter(Boolean);
  lanes.forEach((lane, index) => {
    lanes.slice(index + 1).forEach((other, offset) => {
      assert.ok(!intersects(lane, other, gap), `${label}: lane ${index + 1} overlaps lane ${index + offset + 2}: ${JSON.stringify({ lane, other })}`);
    });
  });
}

async function state(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

function assertBriefingLanes(briefing, label) {
  const eyebrowInk = textInkBounds(briefing.eyebrowBounds, briefing.renderPadding?.eyebrow);
  const titleInk = textInkBounds(briefing.titleBounds, briefing.renderPadding?.title);
  const bodyInk = textInkBounds(briefing.bodyBounds, briefing.renderPadding?.body);
  if (briefing.eyebrowBounds) assertTextInside(briefing.panelBounds, briefing.eyebrowBounds, `${label} briefing eyebrow`, 8);
  assertTextInside(briefing.panelBounds, briefing.titleBounds, `${label} briefing title`, 8);
  if (briefing.bodyBounds) assertTextInside(briefing.panelBounds, briefing.bodyBounds, `${label} briefing body`, 8);
  if (eyebrowInk && titleInk) {
    assert.ok(!intersects(eyebrowInk, titleInk, 2), `${label}: briefing eyebrow overlaps title`);
  }
  if (titleInk && briefing.variantSelectorBounds) {
    assert.ok(!intersects(titleInk, briefing.variantSelectorBounds, 5), `${label}: briefing title overlaps variant selector`);
  }
  if (briefing.statusBounds && briefing.variantSelectorBounds) {
    assert.ok(!intersects(briefing.statusBounds, briefing.variantSelectorBounds, 5), `${label}: status badge overlaps variant selector`);
  }
  if (titleInk && bodyInk) {
    assert.ok(!intersects(titleInk, bodyInk, 5), `${label}: briefing title overlaps body`);
  }
  if (briefing.variantSelectorBounds && bodyInk) {
    assert.ok(!intersects(briefing.variantSelectorBounds, bodyInk, 5), `${label}: briefing body overlaps variant selector`);
  }
  const tileBounds = (briefing.tiles || []).map((tile) => tile.visualBounds || tile.bounds).filter(Boolean);
  tileBounds.forEach((tile, index) => {
    assert.ok(contains(briefing.panelBounds, tile, 7), `${label}: tile ${index + 1} escapes briefing panel`);
    if (briefing.bodyBounds) {
      assert.ok(!intersects(briefing.bodyBounds, tile, 4), `${label}: briefing body overlaps tile ${index + 1}: ${JSON.stringify({ body: briefing.bodyBounds, tile })}`);
    }
    if (briefing.restrictionBounds) {
      assert.ok(!intersects(tile, briefing.restrictionBounds, 4), `${label}: tile ${index + 1} overlaps restriction: ${JSON.stringify({ tile, restriction: briefing.restrictionBounds })}`);
    }
    if (briefing.launchButtonBounds?.width > 0) {
      assert.ok(!intersects(tile, briefing.launchButtonBounds, 4), `${label}: tile ${index + 1} overlaps play button`);
    }
    if (briefing.detailsButtonBounds?.width > 0) {
      assert.ok(!intersects(tile, briefing.detailsButtonBounds, 4), `${label}: tile ${index + 1} overlaps details button`);
    }
    tileBounds.slice(index + 1).forEach((other, otherIndex) => {
      assert.ok(!intersects(tile, other, 2), `${label}: tile ${index + 1} overlaps tile ${index + otherIndex + 2}`);
    });
  });
  if (briefing.restrictionBounds && briefing.launchButtonBounds?.width > 0) {
    assert.ok(!intersects(briefing.restrictionBounds, briefing.launchButtonBounds, 5), `${label}: restriction overlaps play button`);
  }
  if (briefing.restrictionBounds && briefing.detailsButtonBounds?.width > 0) {
    assert.ok(!intersects(briefing.restrictionBounds, briefing.detailsButtonBounds, 5), `${label}: restriction overlaps details button`);
  }
  if (briefing.launchButtonBounds?.width > 0 && briefing.launchButtonLabelBounds) {
    assertTextInside(briefing.launchButtonBounds, briefing.launchButtonLabelBounds, `${label} play button`, 6);
  }
  if (briefing.detailsButtonBounds?.width > 0 && briefing.detailsButtonLabelBounds) {
    assertTextInside(briefing.detailsButtonBounds, briefing.detailsButtonLabelBounds, `${label} details button`, 6);
    assert.ok(
      briefing.detailsButtonLabelBounds.width <= briefing.detailsButtonBounds.width - 12,
      `${label}: details label exceeds its safe text width`
    );
    if (briefing.mode === 'launchTactical') {
      assert.equal(briefing.detailsButtonLabel, 'VIEW MODE DETAILS', `${label}: Mayhem details label must remain complete`);
    }
  }
  if (briefing.personalBestBounds && briefing.launchButtonBounds) {
    assert.ok(!intersects(briefing.personalBestBounds, briefing.launchButtonBounds, 3), `${label}: personal best overlaps play button`);
    if (briefing.detailsButtonBounds) {
      assert.ok(!intersects(briefing.personalBestBounds, briefing.detailsButtonBounds, 3), `${label}: personal best overlaps details button`);
    }
  }
}

async function auditMainMenu(page, viewport, profileName) {
  const optionIds = await page.evaluate(() => window.__game?.currentScene?.menuOptions?.map(option => option.id) || []);
  for (let index = 0; index < optionIds.length; index += 1) {
    await page.evaluate(next => window.__game?.currentScene?.setMenuFocus?.(next), index);
    await page.waitForTimeout(90);
    const snapshot = await state(page);
    const menu = snapshot.menu;
    const focusedId = menu.focusedOption;
    const label = `${viewport.name}/${profileName}/${focusedId}`;
    assert.ok(!intersects(menu.brand?.titleBounds, menu.brand?.subtitleBounds, 3), `${label}: logo overlaps subtitle: ${JSON.stringify(menu.brand)}`);
    assert.ok(!intersects(menu.brand?.titleBounds, menu.brand?.launchDeckBounds, 8), `${label}: logo overlaps launch deck`);
    assert.ok(!intersects(menu.brand?.subtitleBounds, menu.brand?.launchDeckBounds, 8), `${label}: subtitle overlaps launch deck: ${JSON.stringify(menu.brand)}`);
    const iconEntry = Object.values(menu.menuIcons || {}).find(entry => entry.label && (
      (focusedId === 'launchTactical' && entry.label.includes('MAYHEM')) ||
      (focusedId === 'dailySignal' && entry.label.includes('DAILY')) ||
      (focusedId === 'scout' && entry.label.includes('SCOUT')) ||
      (focusedId === 'sectorStart' && entry.label.includes('SECTOR')) ||
      (focusedId === 'overrun' && entry.label.includes('OVERRUN')) ||
      (focusedId === 'hangar' && entry.label.includes('HANGAR')) ||
      (focusedId === 'highscores' && entry.label.includes('LEADERBOARD')) ||
      (focusedId === 'threatCodex' && entry.label.includes('THREAT')) ||
      (focusedId === 'achievements' && entry.label.includes('ACHIEVEMENTS')) ||
      (focusedId === 'settings' && entry.label.includes('SETTINGS')) ||
      (focusedId === 'music' && entry.label.includes('MUSIC')) ||
      (focusedId === 'howToPlay' && entry.label.includes('HOW TO PLAY')) ||
      (focusedId === 'exit' && entry.label.includes('EXIT'))
    ));
    if (iconEntry?.tileBounds && iconEntry?.labelBounds) {
      assertTextInside(iconEntry.tileBounds, iconEntry.labelBounds, `${label} label`, 5);
    }
    const screenBounds = { x: 0, y: 0, width: menu.screen.width, height: menu.screen.height, right: menu.screen.width, bottom: menu.screen.height };
    Object.values(menu.menuIcons || {}).forEach((entry) => {
      if (entry?.tileBounds?.width > 0) assert.ok(contains(screenBounds, entry.tileBounds, 2), `${label}: menu button escapes screen: ${JSON.stringify(entry.tileBounds)}`);
    });
    await page.screenshot({ path: path.join(outputDir, `${viewport.name}-${scaleTag}-${profileName}-main-${String(index + 1).padStart(2, '0')}-${focusedId}.png`) });
    assertBriefingLanes(menu.missionBriefing, label);
  }
  return optionIds;
}

const server = await startDevServer();
process.once('exit', () => server?.kill());
const browser = await chromium.launch({ headless: true, ...(chromePath ? { executablePath: chromePath } : {}) });
const report = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', error => errors.push(error?.message || String(error)));
  await seed(page);
  await page.goto(`${baseUrl}/?skipIntro=1&offlineLeaderboard=1&auditScale=${auditUiScale}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
  await page.waitForTimeout(2200);

  const optionIds = settingsOnly ? [] : await auditMainMenu(page, viewport, 'fresh');

  if (!settingsOnly) {
    await page.goto(`${baseUrl}/?skipIntro=1&offlineLeaderboard=1&auditProfile=progressed&auditScale=${auditUiScale}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
    await page.waitForTimeout(1000);
    await auditMainMenu(page, viewport, 'progressed');
  }

  if (!settingsOnly) {
    await page.evaluate(() => {
      const menu = window.__game?.currentScene;
      menu?.setMenuFocus?.(0);
      menu?.openModeBriefing?.();
    });
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').menu?.modeBriefing?.open === true);
    const modeBriefing = (await state(page)).menu.modeBriefing;
    assert.ok(modeBriefing.panel?.height > 0, `${viewport.name}: mode briefing panel missing`);
    assert.ok(modeBriefing.content?.height > 0, `${viewport.name}: mode briefing content viewport missing`);
    assert.ok(modeBriefing.content.y >= modeBriefing.panel.y, `${viewport.name}: mode briefing content crosses panel top`);
    assert.ok(modeBriefing.content.y + modeBriefing.content.height <= modeBriefing.panel.y + modeBriefing.panel.height, `${viewport.name}: mode briefing content crosses panel footer`);
    await page.screenshot({ path: path.join(outputDir, `${viewport.name}-${scaleTag}-mode-details.png`) });
    await page.evaluate(() => window.__game?.currentScene?.closeModeBriefing?.());
  }

  await page.evaluate(() => window.__game?.currentScene?.openSettingsOverlay?.());
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').overlays?.settings === true);
  const settingsPages = await page.evaluate(() => Object.keys(window.__game?.currentScene?.settingsOverlay?.pageButtons || {}));
  for (const pageId of settingsPages) {
    await page.evaluate(id => window.__game?.currentScene?.settingsOverlay?.setActiveSettingsPage?.(id, { focusTab: true }), pageId);
    await page.waitForTimeout(80);
    const settings = (await state(page)).settingsOverlay;
    for (const [id, pageState] of Object.entries(settings.pages || {})) {
      assertTextInside(pageState.bounds, pageState.labelBounds, `${viewport.name}/settings/${id} tab`, 4);
    }
    for (const control of settings.visibleControls || []) {
      const locatorBounds = control.bounds || control.rowBounds;
      const locatorCenter = locatorBounds ? {
        x: locatorBounds.x + locatorBounds.width / 2,
        y: locatorBounds.y + locatorBounds.height / 2
      } : null;
      const owningSection = locatorCenter
        ? (settings.sectionBounds || []).find((section) => (
          locatorCenter.x >= section.x && locatorCenter.x <= section.right
          && locatorCenter.y >= section.y && locatorCenter.y <= section.bottom
        ))
        : null;
      if (control.bounds && control.valueLabelBounds) {
        assertTextInside(control.bounds, control.valueLabelBounds, `${viewport.name}/settings/${pageId}/${control.id} value`, 4);
      }
      if (control.rowBounds && control.labelBounds) {
        assert.ok(contains(control.rowBounds, control.labelBounds, 0), `${viewport.name}/settings/${pageId}/${control.id}: label escapes row`);
        assert.ok(owningSection && contains(owningSection, control.labelBounds, 10), `${viewport.name}/settings/${pageId}/${control.id}: label touches or crosses section frame: ${JSON.stringify({ owningSection, labelBounds: control.labelBounds })}`);
      }
      if (control.bounds && control.hintBounds) {
        const hintGap = control.hintBounds.x - control.bounds.right;
        assert.ok(hintGap >= 10, `${viewport.name}/settings/${pageId}/${control.id}: status hint is only ${hintGap}px from its control`);
        assert.ok(owningSection && contains(owningSection, control.hintBounds, 10), `${viewport.name}/settings/${pageId}/${control.id}: status hint touches or crosses section frame`);
      }
    }
    const visibleSettingsControls = settings.visibleControls || [];
    visibleSettingsControls.forEach((control, index) => {
      if (!control.descriptionBounds) return;
      assert.ok(contains(settings.panelBounds, control.descriptionBounds, 8), `${viewport.name}/settings/${pageId}/${control.id}: description escapes panel`);
      const locatorBounds = control.bounds || control.rowBounds;
      const locatorCenter = locatorBounds ? {
        x: locatorBounds.x + locatorBounds.width / 2,
        y: locatorBounds.y + locatorBounds.height / 2
      } : null;
      const owningSection = locatorCenter
        ? (settings.sectionBounds || []).find((section) => (
          locatorCenter.x >= section.x && locatorCenter.x <= section.right
          && locatorCenter.y >= section.y && locatorCenter.y <= section.bottom
        ))
        : null;
      assert.ok(owningSection && contains(owningSection, control.descriptionBounds, 10), `${viewport.name}/settings/${pageId}/${control.id}: helper text touches or crosses section frame`);
      if (control.bounds) {
        const ownGap = control.descriptionBounds.y - control.bounds.bottom;
        assert.ok(ownGap >= 5, `${viewport.name}/settings/${pageId}/${control.id}: helper text touches its own control (${ownGap}px)`);
      }
      visibleSettingsControls.slice(index + 1).forEach((other) => {
        const otherBounds = other.bounds || other.rowBounds;
        if (otherBounds) {
          assert.ok(!intersects(control.descriptionBounds, otherBounds, 4), `${viewport.name}/settings/${pageId}/${control.id}: description overlaps ${other.id}`);
          const sharesHorizontalLane = control.descriptionBounds.x < otherBounds.right
            && control.descriptionBounds.right > otherBounds.x;
          if (sharesHorizontalLane && otherBounds.y >= control.descriptionBounds.y) {
            const gap = otherBounds.y - control.descriptionBounds.bottom;
            assert.ok(gap >= 10, `${viewport.name}/settings/${pageId}/${control.id}: helper text is only ${gap}px from ${other.id}`);
          }
        }
      });
    });
    if (pageId === 'prototype') {
      const primarySection = (settings.sectionBounds || []).find((section) => section.key === 'primary');
      const experimentControls = visibleSettingsControls.filter((control) => control.id?.startsWith('experiment_'));
      assert.ok(primarySection, `${viewport.name}/settings/prototype: primary section bounds missing`);
      experimentControls.forEach((control) => {
        const controlBounds = control.bounds || control.rowBounds;
        assert.ok(contains(primarySection, controlBounds, 12), `${viewport.name}/settings/prototype/${control.id}: control touches or crosses section frame: ${JSON.stringify({ primarySection, controlBounds })}`);
        if (control.descriptionBounds) {
          assert.ok(contains(primarySection, control.descriptionBounds, 12), `${viewport.name}/settings/prototype/${control.id}: helper text touches or crosses section frame`);
        }
      });
      experimentControls.forEach((control, index) => {
        const controlBounds = control.bounds || control.rowBounds;
        experimentControls.slice(index + 1).forEach((other) => {
          const otherBounds = other.bounds || other.rowBounds;
          assert.ok(!intersects(controlBounds, otherBounds, 6), `${viewport.name}/settings/prototype: ${control.id} collides with ${other.id}: ${JSON.stringify({ controlBounds, otherBounds })}`);
        });
      });
      assert.ok(contains(primarySection, settings.prototype?.launchButton, 12), `${viewport.name}/settings/prototype: launch action touches or crosses section frame`);
    }
    await page.screenshot({ path: path.join(outputDir, `${viewport.name}-${scaleTag}-${languageTag}-settings-${pageId}.png`) });
  }
  await page.evaluate(() => window.__game?.currentScene?.settingsOverlay?.close?.());

  if (settingsOnly) {
    assert.deepEqual(errors, [], `${viewport.name}: page errors: ${errors.join(' | ')}`);
    report.push({ viewport, menuStates: optionIds, pageErrors: errors });
    await page.close();
    continue;
  }

  await page.evaluate(() => window.__game?.currentScene?.openHowToPlayOverlay?.());
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').overlays?.howToPlay === true);
  const helpPageCount = await page.evaluate(() => window.__game?.currentScene?.howToPlayOverlay?.getDebugState?.().pages?.length || 0);
  for (let helpIndex = 0; helpIndex < helpPageCount; helpIndex += 1) {
    await page.evaluate(index => window.__game?.currentScene?.howToPlayOverlay?.setPage?.(index), helpIndex);
    await page.waitForTimeout(80);
    await page.screenshot({ path: path.join(outputDir, `${viewport.name}-${scaleTag}-how-to-${String(helpIndex + 1).padStart(2, '0')}.png`) });
  }
  await page.evaluate(() => window.__game?.currentScene?.howToPlayOverlay?.close?.());

  await page.evaluate(() => {
    const unlockedShipIds = Array.from({ length: 30 }, (_, index) => `nova_ship_${String(index + 1).padStart(2, '0')}`);
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      version: 1,
      unlockTuningVersion: 3,
      pilotXp: 25000,
      pilotRank: 20,
      highestPilotRank: 20,
      totalRuns: 64,
      bestScore: 420000,
      bestSector: 60,
      bestLevel: 60,
      bestRank: 20,
      runClears: 9,
      totalBossesDefeated: 72,
      totalWavesCleared: 360,
      totalCodexDiscoveries: 180,
      unlockedShipIds,
      lastNewlyUnlockedShipIds: [],
      shipSpecificMilestones: {
        nova_ship_30: { runs: 11, clears: 7, overrunClears: 2, bestSector: 60, bestScore: 420000 }
      }
    }));
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({ bestScore: 420000, bestRank: 20, bestLevel: 60 }));
    localStorage.setItem('burt.selectedShip.v1', 'nova-player-ship-30.png');
    localStorage.setItem('burt.shipUsage.v1', JSON.stringify({ nova_ship_30: 11 }));
    window.__game?.showShipSelect?.();
  });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'shipSelect', null, { timeout: 15000 });
  await page.waitForTimeout(1400);
  const hangar = (await state(page)).shipSelect;
  assertTextInside(hangar.headerLayout?.panelBounds, hangar.headerLayout?.titleBounds, `${viewport.name} Hangar title`, 5);
  assertTextInside(hangar.headerLayout?.panelBounds, hangar.headerLayout?.subtitleBounds, `${viewport.name} Hangar subtitle`, 5);
  assertTextInside(hangar.headerLayout?.panelBounds, hangar.headerLayout?.selectionBounds, `${viewport.name} Hangar selection status`, 5);
  assertLaneSequence([
    hangar.headerLayout?.titleBounds,
    hangar.headerLayout?.subtitleBounds,
    hangar.headerLayout?.selectionBounds
  ], `${viewport.name} Hangar header`, 2);
  assert.ok(!intersects(hangar.headerLayout?.panelBounds, hangar.headerLayout?.recommendationBounds, 6), `${viewport.name}: Hangar header overlaps recommendation`);
  assert.ok(!hangar.careerSignal?.focusBounds?.width || contains(hangar.careerSignal.panelBounds, hangar.careerSignal.focusBounds, 0), `${viewport.name}: Career Signal focus escapes panel: ${JSON.stringify(hangar.careerSignal)}`);
  if (hangar.centerLayout?.masteryBounds && hangar.centerLayout?.shipBounds) {
    assert.ok(!intersects(hangar.centerLayout.masteryBounds, hangar.centerLayout.shipBounds, 6), `${viewport.name}: mastery badge overlaps ship`);
  }
  assert.ok(!intersects(hangar.centerLayout?.descriptionBounds, hangar.centerLayout?.traitBounds, 6), `${viewport.name}: ship description overlaps trait`);
  assert.ok(!intersects(hangar.centerLayout?.traitBounds, hangar.centerLayout?.rosterBounds, 8), `${viewport.name}: ship trait overlaps roster`);
  assert.ok(!intersects(hangar.centerLayout?.compactIntelBounds, hangar.centerLayout?.rosterBounds, 6), `${viewport.name}: compact combat readout overlaps roster`);
  assert.ok(!intersects(hangar.centerLayout?.rosterBounds, hangar.centerLayout?.footerBounds, 6), `${viewport.name}: roster overlaps footer prompt`);
  const intel = hangar.intelLayout || {};
  [hangar.centerLayout?.descriptionBounds, hangar.centerLayout?.traitBounds].filter(Boolean).forEach((lane, index) => {
    assert.ok(!intersects(lane, intel.leftPanelBounds, 8), `${viewport.name}: center narrative ${index + 1} overlaps left intel`);
    assert.ok(!intersects(lane, intel.rightPanelBounds, 8), `${viewport.name}: center narrative ${index + 1} overlaps right intel`);
  });
  [intel.leftProgressBounds, intel.leftStatsBounds, intel.leftHintBounds].filter(Boolean).forEach((lane, index) => {
    assert.ok(contains(intel.leftPanelBounds, lane, 7), `${viewport.name}: left intel lane ${index + 1} touches panel frame`);
  });
  assertLaneSequence([intel.leftProgressBounds, intel.leftStatsBounds, intel.leftHintBounds], `${viewport.name} left intel`, 6);
  [intel.rightRoleBounds, intel.rightWeaponBounds, intel.rightTraitBounds, intel.rightTuneBounds, intel.rightUnlockBounds].filter(Boolean).forEach((lane, index) => {
    assert.ok(contains(intel.rightPanelBounds, lane, 7), `${viewport.name}: right intel lane ${index + 1} touches panel frame`);
  });
  assertLaneSequence([intel.rightRoleBounds, intel.rightWeaponBounds, intel.rightTraitBounds, intel.rightTuneBounds, intel.rightUnlockBounds], `${viewport.name} right intel`, 6);
  [intel.compactRoleBounds, intel.compactWeaponBounds, intel.compactTraitBounds].filter(Boolean).forEach((lane, index) => {
    assert.ok(contains(intel.compactPanelBounds, lane, 6), `${viewport.name}: compact intel lane ${index + 1} touches panel frame`);
  });
  assertLaneSequence([intel.compactRoleBounds, intel.compactWeaponBounds, intel.compactTraitBounds], `${viewport.name} compact intel`, 3);
  [hangar.detailsButton, hangar.startButton, hangar.randomButton].filter(Boolean).forEach((button, index) => {
    assert.ok(!intersects(button, intel.leftPanelBounds, 5), `${viewport.name}: action ${index + 1} overlaps left intel`);
    assert.ok(!intersects(button, intel.rightPanelBounds, 5), `${viewport.name}: action ${index + 1} overlaps right intel`);
  });
  await page.screenshot({ path: path.join(outputDir, `${viewport.name}-${scaleTag}-hangar.png`) });

  await page.evaluate(() => {
    const scene = window.__game?.currentScene;
    const eirikIndex = scene?.ships?.findIndex(ship => String(ship.name || '').toUpperCase().includes('EIRIK')) ?? -1;
    scene?.setCareerSignalPulse?.(true);
    if (eirikIndex >= 0) scene?.navigateTo?.(eirikIndex);
  });
  await page.waitForTimeout(220);
  const matureHangar = (await state(page)).shipSelect;
  if (matureHangar.careerSignal?.focusBounds?.width) {
    assert.ok(contains(matureHangar.careerSignal.panelBounds, matureHangar.careerSignal.focusBounds, 0), `${viewport.name}: active Career Signal frame escapes panel: ${JSON.stringify(matureHangar.careerSignal)}`);
  }
  if (matureHangar.centerLayout?.masteryBounds?.width && matureHangar.centerLayout?.shipBounds) {
    assert.ok(!intersects(matureHangar.centerLayout.masteryBounds, matureHangar.centerLayout.shipBounds, 6), `${viewport.name}: mature mastery badge overlaps ship`);
  }
  assert.ok(!intersects(matureHangar.centerLayout?.descriptionBounds, matureHangar.centerLayout?.traitBounds, 6), `${viewport.name}: mature ship description overlaps trait`);
  assert.ok(!intersects(matureHangar.centerLayout?.traitBounds, matureHangar.centerLayout?.rosterBounds, 8), `${viewport.name}: mature ship trait overlaps roster`);
  assert.ok(!intersects(matureHangar.centerLayout?.compactIntelBounds, matureHangar.centerLayout?.rosterBounds, 6), `${viewport.name}: mature compact combat readout overlaps roster`);
  assert.ok(!intersects(matureHangar.centerLayout?.rosterBounds, matureHangar.centerLayout?.footerBounds, 6), `${viewport.name}: mature roster overlaps footer prompt`);
  await page.screenshot({ path: path.join(outputDir, `${viewport.name}-${scaleTag}-hangar-eirik.png`) });

  assert.deepEqual(errors, [], `${viewport.name}: page errors: ${errors.join(' | ')}`);
  report.push({ viewport, menuStates: optionIds, pageErrors: errors });
  await page.close();
}

await browser.close();
server?.kill();
console.log(JSON.stringify({ status: 'passed', outputDir, language: auditLanguage, uiScale: auditUiScale, report }, null, 2));
