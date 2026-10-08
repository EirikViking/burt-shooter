import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { createText } from '../utils/pixiText.js';
import { translateText as t, formatNumber } from '../i18n/index.js';
import { STEAM_ONSLAUGHT_LEADERBOARD_NAME } from '../leaderboard/LeaderboardTypes.js';
import { chooseOnslaughtTarget, getFlightTargets, getOnslaughtBest, getVisibleOnslaughtBest } from '../progression/OnslaughtChallenge.js';
import { getSelectableShips, isShipUnlocked } from '../config/ShipMetadata.js';
import { getTacticalDraftMeta } from '../config/TacticalDraft.js';
import { validOnslaughtStartAugments } from '../../electron/onslaughtContract.cjs';
import { saveOnslaughtLoadout } from '../game/OnslaughtLoadout.js';
import { RUN_MODES } from '../game/RunMode.js';
import { SolidShipView } from './SolidShipView.js';

function inspectorButton(label, action, x, y, width) {
  const button = new Container();
  button.position.set(x, y);
  button.eventMode = 'static';
  button.cursor = 'pointer';
  button.hitArea = new Rectangle(0, 0, width, 40);
  const bg = new Graphics();
  const caption = createText(t(label), { fontFamily: 'Rajdhani, Bahnschrift, sans-serif', fontSize: 17, fontWeight: '800', fill: 0xeaf8f5 });
  caption.anchor.set(0.5);
  caption.position.set(width / 2, 20);
  button.addChild(bg, caption);
  button.setFocused = (focused) => {
    bg.clear().roundRect(0, 0, width, 40, 5)
      .fill({ color: focused ? 0x164b52 : 0x13283e, alpha: 0.98 })
      .stroke({ color: focused ? 0xffd15c : 0x37f5ff, width: focused ? 2 : 1, alpha: 0.9 });
  };
  button.setFocused(false);
  button.on('pointertap', action);
  return { button, action };
}

export function closeOnslaughtLoadoutInspector(scene) {
  const inspector = scene.onslaughtInspector;
  if (inspector?.ticker) scene.game.app.ticker.remove(inspector.ticker);
  inspector?.view?.dispose();
  inspector?.liveTexture?.destroy(true);
  scene.onslaughtInspector?.container?.destroy({ children: true });
  scene.onslaughtInspector = null;
  scene.gamepadNavigator?.suppressUntilReleased?.();
}

export function openOnslaughtLoadoutInspector(scene, entry) {
  closeOnslaughtLoadoutInspector(scene);
  const width = scene.game.app.screen.width;
  const height = scene.game.app.screen.height;
  const panelWidth = Math.min(720, width - 36);
  const panelHeight = Math.min(450, height - 54);
  const px = (width - panelWidth) / 2;
  const py = (height - panelHeight) / 2;
  const overlay = new Container();
  overlay.label = 'ui_onslaught_loadout_inspector';
  overlay.zIndex = 2000;
  overlay.eventMode = 'static';
  overlay.hitArea = new Rectangle(0, 0, width, height);
  overlay.addChild(new Graphics().rect(0, 0, width, height).fill({ color: 0x01060e, alpha: 0.8 }));
  overlay.addChild(new Graphics().roundRect(px, py, panelWidth, panelHeight, 8)
    .fill({ color: 0x071928, alpha: 0.99 })
    .stroke({ color: 0xd8a66b, width: 2, alpha: 0.95 }));
  const line = (value, y, size = 18, color = 0xe6eef0, x = px + 20, wrap = panelWidth - 40) => {
    const node = createText(t(value), { fontFamily: 'Rajdhani, Bahnschrift, sans-serif', fontSize: size, fontWeight: '700', fill: color,
      wordWrap: true, wordWrapWidth: wrap });
    node.position.set(x, y);
    overlay.addChild(node);
    return node;
  };
  line('INSPECT STARTING LOADOUT', py + 16, 25, 0xffdba1);
  line(entry.name || entry.playerName || t('STEAM PILOT'), py + 53, 22, 0xeefcff);
  line(`#${entry.rank}  ·  ${formatNumber(entry.score)}`, py + 81, 18, 0x9dded7);
  const data = entry.startingLoadout;
  const ship = data && getSelectableShips().find(candidate => candidate.id === data.shipId);
  const legal = Boolean(ship && isShipUnlocked(ship.spriteKey) && validOnslaughtStartAugments(data?.augmentIds));
  const visualX = px + 126;
  const visualY = py + 228;
  const cardX = px + 255;
  const cardWidth = panelWidth - 275;
  const portrait = new Graphics().roundRect(px + 18, py + 116, 215, panelHeight - 190, 10)
    .fill({ color: 0x0a2132, alpha: 0.95 })
    .stroke({ color: 0x4b9ca7, width: 1.5, alpha: 0.8 });
  overlay.addChild(portrait);
  let view = null;
  let liveTexture = null;
  let ticker = null;
  if (data && ship) {
    line(t(ship.name), py + 118, 22, 0xffe3a0, cardX, cardWidth);
    line(t(ship.role || 'Balanced'), py + 145, 16, 0x9dded7, cardX, cardWidth);
    try {
      view = new SolidShipView(ship.textureIndex, 512, 'hangar');
      void view.promise.then(() => {
        if (scene.onslaughtInspector?.container !== overlay || !view.ready) return;
        view.render(0);
        liveTexture = Texture.from(view.canvas);
        const shipSprite = new Sprite(liveTexture);
        shipSprite.anchor.set(0.5);
        shipSprite.position.set(visualX, visualY);
        shipSprite.scale.set(225 / view.size);
        overlay.addChild(shipSprite);
        let angle = 0;
        let frames = 0;
        ticker = () => {
          if (++frames % 4 || scene.onslaughtInspector?.container !== overlay) return;
          angle += 0.012;
          if (view.render(angle)) liveTexture.source.update();
        };
        scene.game.app.ticker.add(ticker);
        Object.assign(scene.onslaughtInspector, { view, liveTexture, ticker });
      }).catch(() => { view?.dispose(); });
    } catch { view?.dispose(); }
    data.augmentIds.forEach((id, index) => {
      const augment = getTacticalDraftMeta(id);
      const y = py + 177 + index * 48;
      overlay.addChild(new Graphics().roundRect(cardX, y, cardWidth, 42, 5)
        .fill({ color: 0x102d3a, alpha: 0.95 })
        .stroke({ color: 0x59a9ad, width: 1, alpha: 0.75 }));
      line(`${index + 1}. ${t(augment?.name || id)}`, y + 9, 18, 0xe4f8f5, cardX + 12, cardWidth - 24);
    });
    if (!legal) line('This ship is locked or the loadout is no longer legal.', py + panelHeight - 118, 14, 0xffc68a, cardX, cardWidth);
  } else {
    line('Starting build unavailable for this record.', py + 150, 19, 0xffc68a);
  }
  const gap = 12;
  const buttonWidth = Math.min(220, (panelWidth - 52 - gap) / 2);
  const buttonY = py + panelHeight - 58;
  const close = inspectorButton('BACK', () => closeOnslaughtLoadoutInspector(scene), px + panelWidth - 20 - buttonWidth, buttonY, buttonWidth);
  const buttons = [close];
  if (legal) {
    const tryButton = inspectorButton('TRY THIS LOADOUT', () => {
      saveOnslaughtLoadout(ship.spriteKey, data.augmentIds);
      closeOnslaughtLoadoutInspector(scene);
      void scene.game.startGame(ship.spriteKey, { runMode: RUN_MODES.OVERRUN_TACTICAL,
        reuseOnslaughtLoadout: true, onslaughtAugmentIds: [...data.augmentIds] });
    }, px + 20, buttonY, buttonWidth);
    buttons.unshift(tryButton);
  }
  buttons.forEach(({ button }) => overlay.addChild(button));
  scene.container.addChild(overlay);
  scene.onslaughtInspector = { container: overlay, buttons, focus: 0, entry, view, liveTexture, ticker };
  buttons[0].button.setFocused(true);
  scene.gamepadNavigator?.suppressUntilReleased?.();
}

function getSteamSyncStatus(scene, best) {
  const pending = scene.leaderboardAdapter?.getPendingSteamSubmissions?.() || [];
  const hasOnslaughtPending = pending.some((entry) =>
    (entry?.leaderboardName || entry?.runResult?.leaderboardName) === STEAM_ONSLAUGHT_LEADERBOARD_NAME);
  if (hasOnslaughtPending) {
    return scene.leaderboardAdapter?.isSteamAvailable?.() ? t('Submitting') : t('Queued offline');
  }
  const accepted = best?.steamAccepted?.runId === best?.runId
    && Number(best?.steamAccepted?.score) >= Number(best?.score);
  if (accepted) return t(best.steamAccepted.bestUnchanged ? 'Existing best retained' : 'Submitted');
  return best ? t('Saved locally') : t('No saved Onslaught score');
}

function formatTargetProgress(goal) {
  const progress = Math.min(goal.value, Math.max(0, Number(goal.progress) || 0));
  if (goal.metric === 'bossKills') {
    return t('Best run: {progress}/{target} bosses', { progress, target: goal.value });
  }
  return t('Best run: {progress}/{target} sectors', { progress, target: goal.value });
}

// Menu-only presentation. No polling or gameplay ticker work.
export function renderOnslaughtRecords(scene, startY, layout) {
  const rows = scene.rowsContainer;
  scene.clearRenderedLeaderboardRows({ destroyChildren: true });
  scene.onslaughtRowControls = [];
  const metrics = scene.tableMetrics;
  const x = metrics.innerX + 10;
  const w = metrics.innerWidth - 20;
  const compact = w < 640;
  const bottom = metrics.rowsBottom - 12;
  let y = startY + 6;
  const text = (value, px, py, size = 18, color = 0xdcecf3, width = w) => {
    const node = createText(value, {
      fontSize: size,
      fill: color,
      fontFamily: 'Rajdhani, Bahnschrift, Segoe UI, sans-serif',
      fontWeight: '600',
      wordWrap: true,
      wordWrapWidth: width,
      lineHeight: size * 1.16
    });
    node.position.set(px, py);
    rows.addChild(node);
    return node;
  };

  const best = getOnslaughtBest();
  const visibleBest = getVisibleOnslaughtBest(best, scene.status === 'LOADED' ? scene.entriesNormalized : []);
  const target = chooseOnslaughtTarget(scene.entriesNormalized, visibleBest);
  const targetLine = target.kind === 'record'
    ? t('Next record: #{rank} · {score}', { rank: target.rank, score: formatNumber(target.score) })
    : target.kind === 'personal'
      ? t('Beat your best: {score}', { score: formatNumber(target.score) })
      : t(target.target.text);
  const syncStatus = getSteamSyncStatus(scene, best);
  const goals = getFlightTargets(best);
  const earned = goals.filter((goal) => goal.earned).length;
  const next = goals.find((goal) => !goal.earned) || goals.at(-1);
  const companion = goals.find((goal) => goal.id !== next.id && !goal.earned && goal.metric !== next.metric)
    || goals.find((goal) => goal.id !== next.id && !goal.earned)
    || goals.find((goal) => goal.id !== next.id)
    || next;
  const visibleGoals = [next, companion].filter((goal, index, list) => goal && list.findIndex((item) => item.id === goal.id) === index);
  const panelGap = 10;
  const summaryWidth = compact ? w : Math.max(300, w * 0.42);
  const targetsX = compact ? x : x + summaryWidth + panelGap;
  const targetsWidth = compact ? w : w - summaryWidth - panelGap;
  const cardHeight = compact ? 104 : 108;
  const card = new Graphics().roundRect(x, y, summaryWidth, cardHeight, 6).fill({ color: 0x13243d, alpha: 0.97 }).stroke({ color: 0xc9a770, width: 1, alpha: 0.8 });
  rows.addChild(card);
  text(t('YOUR ONSLAUGHT BEST'), x + 14, y + 9, 13, 0xcbb282);
  const own = visibleBest ? formatNumber(visibleBest.score) : t('No score yet');
  text(own, x + 14, y + 27, compact ? 22 : 25, 0xf3f6ee, summaryWidth - 28);
  text(t('STEAM SYNC · {status}', { status: syncStatus }), x + 14, y + 58, 13, 0x9dded7, summaryWidth - 28);
  text(t('NEXT · {target}', { target: targetLine }), x + 14, y + 80, 14, 0xe6d3aa, summaryWidth - 28);

  text(t('FLIGHT TARGETS · {earned}/{total} COMPLETE', { earned, total: goals.length }), targetsX, compact ? y + cardHeight + 11 : y + 2, 13, 0xcbb282);
  const goalStartY = compact ? y + cardHeight + 31 : y + 23;
  const goalGap = compact ? 7 : 10;
  const goalWidth = compact ? w : (targetsWidth - goalGap) / 2;
  const goalHeight = compact ? 48 : 78;
  visibleGoals.forEach((goal, index) => {
    const gx = compact ? x : targetsX + index * (goalWidth + goalGap);
    const gy = compact ? goalStartY + index * (goalHeight + goalGap) : goalStartY;
    const frame = new Graphics().roundRect(gx, gy, goalWidth, goalHeight, 5)
      .fill({ color: goal.earned ? 0x10352d : 0x0b1c30, alpha: 0.96 })
      .stroke({ color: goal.earned ? 0x7dffcc : 0x37f5ff, width: 1, alpha: 0.64 });
    rows.addChild(frame);
    text(`${goal.earned ? '✓ ' : ''}${t(goal.text)}`, gx + 10, gy + 8, 14, goal.earned ? 0xaefbd9 : 0xe7f0f1, goalWidth - 20);
    text(formatTargetProgress(goal), gx + 10, gy + (compact ? 29 : 50), 12, 0x8ba9b9, goalWidth - 20);
  });
  y = compact
    ? goalStartY + visibleGoals.length * goalHeight + Math.max(0, visibleGoals.length - 1) * goalGap + 12
    : y + cardHeight + 12;

  text(t('GLOBAL RECORDS · STEAM PILOTS'), x, y, 15, 0xf1d7a9);
  y += 24;
  const resultStatus = scene.activeLeaderboardResult?.status;
  const isCached = scene.activeLeaderboardResult?.cached === true;
  if (scene.status === 'LOADING') {
    text(t('Loading records…'), x, y, 17, 0xbad1df);
    y += 27;
  } else if (scene.status !== 'LOADED') {
    const unavailable = resultStatus === 'unavailable' || !scene.leaderboardAdapter?.isSteamAvailable?.();
    text(t(unavailable ? 'Offline — Steam records unavailable. Local results and Flight Targets are safe.' : 'Request failed — Retry'), x, y, 17, 0xffc68a);
    y += 27;
  } else if (isCached) {
    text(t('Cached Steam records · Offline'), x, y, 14, 0xffc68a);
    y += 23;
  } else if (!scene.entriesNormalized.length && !scene.onslaughtOffset) {
    text(t('Steam confirmed: no Onslaught records yet.'), x, y, 18, 0xbad1df);
    const hasPendingUpload = scene.leaderboardAdapter?.getPendingSteamSubmissions?.()?.some((entry) =>
      (entry?.leaderboardName || entry?.runResult?.leaderboardName) === STEAM_ONSLAUGHT_LEADERBOARD_NAME);
    if (hasPendingUpload) {
      text(t('Your saved result will appear after Steam confirms the upload.'), x, y + 27, 14, 0x8ba9b9);
    }
    y += hasPendingUpload ? 52 : 27;
  }

  const pageSize = Math.max(1, Math.min(10, Math.floor((bottom - y - 16) / 43)));
  const entries = scene.entriesNormalized;
  scene.leaderboardPageSize = pageSize;
  const localPages = Math.max(1, Math.ceil(entries.length / pageSize));
  scene.leaderboardPageCount = localPages + (scene.onslaughtHasMore ? 1 : 0);
  scene.leaderboardPage = Math.max(0, Math.min(localPages - 1, scene.leaderboardPage));
  const offset = scene.leaderboardPage * pageSize;
  const visible = entries.slice(offset, offset + pageSize);
  scene.rowLayoutDebug = [];
  visible.forEach((entry, index) => {
    const ry = y + index * 43;
    const frame = new Graphics();
    frame.drawState = (focused = false) => frame.clear().roundRect(x, ry, w, 37, 4)
      .fill({ color: entry.isCurrentPlayer ? 0x16372f : 0x0c1b2b, alpha: 0.95 })
      .stroke({ color: focused ? 0xffd15c : 0x37f5ff, width: focused ? 2 : 1, alpha: focused ? 0.95 : 0.25 });
    frame.drawState();
    frame.eventMode = 'static';
    frame.cursor = 'pointer';
    frame.on('pointertap', () => openOnslaughtLoadoutInspector(scene, entry));
    rows.addChild(frame);
    text(`#${entry.rank}`, x + 10, ry + 8, 17, 0xd9b575, 62);
    const name = text(entry.name || entry.playerName, x + 76, ry + 8, 17, 0xe6f2f5, Math.max(60, w - 205));
    name.style.wordWrap = false;
    if (name.width > w - 205) name.scale.set((w - 205) / name.width);
    const score = text(formatNumber(entry.score), x + w - 92, ry + 8, 17, 0xc9eee4, 120);
    score.anchor.x = 1;
    text(t('INSPECT'), x + w - 77, ry + 10, 13, 0xffdba1, 68);
    scene.onslaughtRowControls.push({ id: `record-${entry.rank}-${index}`, button: frame,
      activate: () => openOnslaughtLoadoutInspector(scene, entry) });
    scene.rowLayoutDebug.push({ rank: entry.rank, score: entry.score, name: entry.name, source: 'steam', x, y: ry, width: w, height: 37 });
  });
  scene.leaderboardPageRange = { start: (scene.onslaughtOffset || 0) + offset + 1, end: (scene.onslaughtOffset || 0) + offset + visible.length, total: entries.length, page: scene.leaderboardPage };
  scene.unrenderedLeaderboardEntries = Math.max(0, entries.length - offset - visible.length);
  scene.onslaughtPanelDebug = { status: scene.status, realRows: entries.length, visibleRows: visible.length, localBest: best?.score ?? null, syncStatus, target, earnedTargets: earned, pageSize };
}
