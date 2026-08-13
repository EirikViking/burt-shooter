import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.CHECK_URL || 'http://127.0.0.1:4746';
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || 'test-results/menu-overlap-audit');
const viewports = [
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'supported-1280', width: 1280, height: 720 }
];
const chromePath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].filter(Boolean).find(existsSync);

mkdirSync(outputDir, { recursive: true });

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

function assertTextInside(frame, text, label, padding = 6) {
  assert.ok(frame && text, `${label}: missing measurable bounds`);
  assert.ok(contains(frame, text, padding), `${label}: text touches or crosses frame: ${JSON.stringify({ frame, text })}`);
}

async function seed(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      totalRuns: 0,
      bestScore: 0,
      bestSector: 1,
      bestLevel: 1,
      totalBossesDefeated: 0,
      totalWavesCleared: 0
    }));
  });
}

async function state(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

const browser = await chromium.launch({ headless: true, ...(chromePath ? { executablePath: chromePath } : {}) });
const report = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', error => errors.push(error?.message || String(error)));
  await seed(page);
  await page.goto(`${baseUrl}/?skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
  await page.waitForTimeout(2200);

  const optionIds = await page.evaluate(() => window.__game?.currentScene?.menuOptions?.map(option => option.id) || []);
  for (let index = 0; index < optionIds.length; index += 1) {
    await page.evaluate(next => window.__game?.currentScene?.setMenuFocus?.(next), index);
    await page.waitForTimeout(90);
    const snapshot = await state(page);
    const menu = snapshot.menu;
    const focusedId = menu.focusedOption;
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
      assertTextInside(iconEntry.tileBounds, iconEntry.labelBounds, `${viewport.name}/${focusedId} label`, 5);
    }
    const briefing = menu.missionBriefing;
    assertTextInside(briefing.panelBounds, briefing.titleBounds, `${viewport.name}/${focusedId} briefing title`, 8);
    if (briefing.bodyBounds) assertTextInside(briefing.panelBounds, briefing.bodyBounds, `${viewport.name}/${focusedId} briefing body`, 8);
    if (briefing.launchButtonBounds?.width > 0 && briefing.launchButtonLabelBounds) {
      assertTextInside(briefing.launchButtonBounds, briefing.launchButtonLabelBounds, `${viewport.name}/${focusedId} play button`, 6);
    }
    if (briefing.detailsButtonBounds?.width > 0 && briefing.detailsButtonLabelBounds) {
      assertTextInside(briefing.detailsButtonBounds, briefing.detailsButtonLabelBounds, `${viewport.name}/${focusedId} details button`, 6);
    }
    if (briefing.personalBestBounds && briefing.launchButtonBounds) {
      assert.ok(!intersects(briefing.personalBestBounds, briefing.launchButtonBounds, 3), `${viewport.name}/${focusedId}: personal best overlaps play button`);
      if (briefing.detailsButtonBounds) {
        assert.ok(!intersects(briefing.personalBestBounds, briefing.detailsButtonBounds, 3), `${viewport.name}/${focusedId}: personal best overlaps details button`);
      }
    }
    await page.screenshot({ path: path.join(outputDir, `${viewport.name}-main-${String(index + 1).padStart(2, '0')}-${focusedId}.png`) });
  }

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
  await page.screenshot({ path: path.join(outputDir, `${viewport.name}-mode-details.png`) });
  await page.evaluate(() => window.__game?.currentScene?.closeModeBriefing?.());

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
      if (control.bounds && control.valueLabelBounds) {
        assertTextInside(control.bounds, control.valueLabelBounds, `${viewport.name}/settings/${pageId}/${control.id} value`, 4);
      }
      if (control.rowBounds && control.labelBounds) {
        assert.ok(contains(control.rowBounds, control.labelBounds, 0), `${viewport.name}/settings/${pageId}/${control.id}: label escapes row`);
      }
    }
    await page.screenshot({ path: path.join(outputDir, `${viewport.name}-settings-${pageId}.png`) });
  }
  await page.evaluate(() => window.__game?.currentScene?.settingsOverlay?.close?.());

  await page.evaluate(() => window.__game?.currentScene?.openHowToPlayOverlay?.());
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').overlays?.howToPlay === true);
  const helpPageCount = await page.evaluate(() => window.__game?.currentScene?.howToPlayOverlay?.getDebugState?.().pages?.length || 0);
  for (let helpIndex = 0; helpIndex < helpPageCount; helpIndex += 1) {
    await page.evaluate(index => window.__game?.currentScene?.howToPlayOverlay?.setPage?.(index), helpIndex);
    await page.waitForTimeout(80);
    await page.screenshot({ path: path.join(outputDir, `${viewport.name}-how-to-${String(helpIndex + 1).padStart(2, '0')}.png`) });
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
  assert.ok(!hangar.careerSignal?.focusBounds?.width || contains(hangar.careerSignal.panelBounds, hangar.careerSignal.focusBounds, 0), `${viewport.name}: Career Signal focus escapes panel: ${JSON.stringify(hangar.careerSignal)}`);
  if (hangar.centerLayout?.masteryBounds && hangar.centerLayout?.shipBounds) {
    assert.ok(!intersects(hangar.centerLayout.masteryBounds, hangar.centerLayout.shipBounds, 6), `${viewport.name}: mastery badge overlaps ship`);
  }
  assert.ok(!intersects(hangar.centerLayout?.descriptionBounds, hangar.centerLayout?.traitBounds, 6), `${viewport.name}: ship description overlaps trait`);
  assert.ok(!intersects(hangar.centerLayout?.traitBounds, hangar.centerLayout?.rosterBounds, 8), `${viewport.name}: ship trait overlaps roster`);
  assert.ok(!intersects(hangar.centerLayout?.rosterBounds, hangar.centerLayout?.footerBounds, 6), `${viewport.name}: roster overlaps footer prompt`);
  await page.screenshot({ path: path.join(outputDir, `${viewport.name}-hangar.png`) });

  await page.evaluate(() => {
    const scene = window.__game?.currentScene;
    const eirikIndex = scene?.ships?.findIndex(ship => String(ship.name || '').toUpperCase().includes('EIRIK')) ?? -1;
    scene?.setCareerSignalPulse?.(true);
    if (eirikIndex >= 0) scene?.navigateTo?.(eirikIndex);
  });
  await page.waitForTimeout(220);
  const matureHangar = (await state(page)).shipSelect;
  assert.ok(contains(matureHangar.careerSignal.panelBounds, matureHangar.careerSignal.focusBounds, 0), `${viewport.name}: active Career Signal frame escapes panel: ${JSON.stringify(matureHangar.careerSignal)}`);
  if (matureHangar.centerLayout?.masteryBounds?.width && matureHangar.centerLayout?.shipBounds) {
    assert.ok(!intersects(matureHangar.centerLayout.masteryBounds, matureHangar.centerLayout.shipBounds, 6), `${viewport.name}: mature mastery badge overlaps ship`);
  }
  assert.ok(!intersects(matureHangar.centerLayout?.descriptionBounds, matureHangar.centerLayout?.traitBounds, 6), `${viewport.name}: mature ship description overlaps trait`);
  assert.ok(!intersects(matureHangar.centerLayout?.traitBounds, matureHangar.centerLayout?.rosterBounds, 8), `${viewport.name}: mature ship trait overlaps roster`);
  assert.ok(!intersects(matureHangar.centerLayout?.rosterBounds, matureHangar.centerLayout?.footerBounds, 6), `${viewport.name}: mature roster overlaps footer prompt`);
  await page.screenshot({ path: path.join(outputDir, `${viewport.name}-hangar-eirik.png`) });

  assert.deepEqual(errors, [], `${viewport.name}: page errors: ${errors.join(' | ')}`);
  report.push({ viewport, menuStates: optionIds, pageErrors: errors });
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ status: 'passed', outputDir, report }, null, 2));
