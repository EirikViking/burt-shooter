import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.CHECK_URL || 'http://127.0.0.1:4746';
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || 'test-results/menu-overlap-audit');
const auditUiScale = Math.max(1, Math.min(2, Number(process.env.CHECK_UI_SCALE) || 1));
const scaleTag = `scale-${String(auditUiScale).replace('.', '_')}`;
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
    const progressed = new URL(window.location.href).searchParams.get('auditProfile') === 'progressed';
    const uiScale = Math.max(1, Math.min(2, Number(new URL(window.location.href).searchParams.get('auditScale')) || 1));
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova_ui_scale_v1', String(uiScale));
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      totalRuns: progressed ? 64 : 0,
      bestScore: progressed ? 420000 : 0,
      bestSector: progressed ? 60 : 1,
      bestLevel: progressed ? 60 : 1,
      totalBossesDefeated: progressed ? 72 : 0,
      totalWavesCleared: progressed ? 360 : 0
    }));
  });
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
  assertTextInside(briefing.panelBounds, briefing.titleBounds, `${label} briefing title`, 8);
  if (briefing.bodyBounds) assertTextInside(briefing.panelBounds, briefing.bodyBounds, `${label} briefing body`, 8);
  if (briefing.variantSelectorBounds && briefing.bodyBounds) {
    assert.ok(!intersects(briefing.variantSelectorBounds, briefing.bodyBounds, 5), `${label}: briefing body overlaps variant selector`);
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

  const optionIds = await auditMainMenu(page, viewport, 'fresh');

  await page.goto(`${baseUrl}/?skipIntro=1&offlineLeaderboard=1&auditProfile=progressed&auditScale=${auditUiScale}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
  await page.waitForTimeout(1000);
  await auditMainMenu(page, viewport, 'progressed');

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
    const visibleSettingsControls = settings.visibleControls || [];
    visibleSettingsControls.forEach((control, index) => {
      if (!control.descriptionBounds) return;
      assert.ok(contains(settings.panelBounds, control.descriptionBounds, 8), `${viewport.name}/settings/${pageId}/${control.id}: description escapes panel`);
      visibleSettingsControls.slice(index + 1).forEach((other) => {
        const otherBounds = other.bounds || other.rowBounds;
        if (otherBounds) {
          assert.ok(!intersects(control.descriptionBounds, otherBounds, 4), `${viewport.name}/settings/${pageId}/${control.id}: description overlaps ${other.id}`);
        }
      });
    });
    await page.screenshot({ path: path.join(outputDir, `${viewport.name}-${scaleTag}-settings-${pageId}.png`) });
  }
  await page.evaluate(() => window.__game?.currentScene?.settingsOverlay?.close?.());

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
console.log(JSON.stringify({ status: 'passed', outputDir, report }, null, 2));
