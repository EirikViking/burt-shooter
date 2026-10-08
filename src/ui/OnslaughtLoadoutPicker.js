import { translateText as t } from '../i18n/index.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import { getSelectableShips, getShipMetadata, isShipUnlocked } from '../config/ShipMetadata.js';
import { setSelectedShipKey } from '../utils/ShipSelectionState.js';
import { getOnslaughtStartingAugments, getSavedOnslaughtLoadout, ONSLAUGHT_LOADOUT_PRESETS, saveOnslaughtLoadout } from '../game/OnslaughtLoadout.js';
import { AchievementsScene } from '../scenes/AchievementsScene.js';
import { RUN_MODES } from '../game/RunMode.js';
import { AudioManager } from '../audio/AudioManager.js';
import { getAccessibilitySettings } from '../config/AccessibilitySettings.js';

export function chooseOnslaughtLoadout(game, spriteKey) {
  if (typeof document === 'undefined') return Promise.resolve({ spriteKey, augmentIds: getSavedOnslaughtLoadout(spriteKey) });
  if (game.onslaughtLoadoutPickerPromise) return game.onslaughtLoadoutPickerPromise;
  const unlockedShips = getSelectableShips().filter(ship => isShipUnlocked(ship.spriteKey));
  let chosenSpriteKey = unlockedShips.find(ship => ship.spriteKey === spriteKey)?.spriteKey || unlockedShips[0]?.spriteKey || spriteKey;
  const augments = getOnslaughtStartingAugments();
  const byId = new Map(augments.map(augment => [augment.id, augment]));
  const previousFocus = document.activeElement;
  const selected = getSavedOnslaughtLoadout(chosenSpriteKey);
  const editsByShip = new Map();
  let category = 'offense';
  let activeSlot = 0;
  let pickerOpen = false;
  let closed = false;
  let frame = 0;
  const nav = new GamepadNavigator();
  nav.suppressUntilReleased();

  const element = (tag, className, text = '') => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  };
  const overlay = element('div', 'onslaught-loadout-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', t('ONSLAUGHT LOADOUT'));
  const style = document.createElement('style');
  style.textContent = `
    .onslaught-loadout-overlay{position:fixed;inset:0;z-index:999999;background:#020811ed;color:#eaf7ff;font-family:Rajdhani,Segoe UI,sans-serif;display:grid;place-items:center;padding:16px}
    .onslaught-loadout-panel{box-sizing:border-box;width:min(860px,96vw);max-height:94vh;display:flex;flex-direction:column;gap:12px;padding:24px 28px;border:1px solid #cba667;border-radius:12px;background:linear-gradient(155deg,#14283d,#0a1a2a 54%,#071521);box-shadow:0 28px 80px #000b,0 0 0 5px #071522b8,0 0 36px #27d9ff25;overflow:auto}
    .onslaught-loadout-head{padding-bottom:13px;border-bottom:1px solid #496c79}
    .onslaught-loadout-head h1{margin:0;color:#fff1ac;font:700 clamp(25px,3vw,36px) Rajdhani,Segoe UI,sans-serif;letter-spacing:.04em}
    .onslaught-loadout-head p{margin:4px 0 0;color:#cbe7f2;font-size:clamp(14px,1.6vw,17px);line-height:1.3;max-width:72ch}
    .onslaught-loadout-ship{display:grid;grid-template-columns:64px 1fr 64px;align-items:center;gap:12px;padding:12px;background:linear-gradient(100deg,#0b2031,#132b3b 50%,#0b2031);border:1px solid #568d99;border-radius:9px;box-shadow:inset 0 1px #9deeff22}
    .onslaught-loadout-ship button{height:66px;text-align:center!important;font-size:30px!important}
    .onslaught-loadout-ship .ship-identity{text-align:center;min-width:0}
    .onslaught-loadout-ship strong{display:block;color:#fff1ac;font-size:clamp(22px,3vw,31px);line-height:1.1}
    .onslaught-loadout-ship small{display:block;color:#a9d9e4;font-size:15px;line-height:1.15}
    .onslaught-loadout-label{color:#9ceeff;font-size:15px;font-weight:800;letter-spacing:.09em}
    .onslaught-loadout-slots,.onslaught-loadout-presets{display:flex;gap:10px;flex-wrap:wrap;align-items:stretch}
    .onslaught-loadout-slots button{flex:1 1 200px;min-height:94px;border-color:#689fad;box-shadow:inset 0 1px #bcefff22}
    .onslaught-loadout-slots button[aria-pressed=true]{border-color:#ffd582;box-shadow:0 0 0 1px #ffd58255,inset 0 1px #ffe4a155}
    .onslaught-loadout-slots button.augment-equipped{animation:augment-slot-click .38s cubic-bezier(.16,.8,.2,1) both}
    @keyframes augment-slot-click{0%{transform:translateY(-14px) scale(1.055);box-shadow:0 0 0 2px #ffe580,0 0 25px #37f5ffbb}55%{transform:translateY(3px) scale(.98);box-shadow:0 0 0 2px #ffe580,0 0 13px #37f5ff88}100%{transform:translateY(0) scale(1);box-shadow:0 0 0 0 transparent}}
    @media(prefers-reduced-motion:reduce){.onslaught-loadout-slots button.augment-equipped{animation:none}}
    .onslaught-loadout-presets{padding:1px 0 10px;border-bottom:1px solid #416676}
    .onslaught-loadout-presets button{min-height:36px;border-radius:5px}
    .onslaught-loadout-picker{display:flex;flex-direction:column;gap:9px;min-height:0}
    .onslaught-loadout-picker[hidden]{display:none}
    .onslaught-loadout-categories{display:flex;gap:8px;flex-wrap:wrap}
    .onslaught-loadout-categories button{flex:1 1 110px;text-align:center;font-size:15px}
    .onslaught-loadout-choices{overflow:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;align-content:start;padding:3px 5px 8px 1px;max-height:min(290px,34vh)}
    .onslaught-loadout-overlay button{box-sizing:border-box;background:#102e3a;color:#eaf7ff;border:1px solid #61aeba;border-radius:7px;font:700 17px Rajdhani,Segoe UI,sans-serif;cursor:pointer;text-align:left;padding:8px 12px}
    .onslaught-loadout-overlay button:hover{background:#174554}
    .onslaught-loadout-overlay button:focus{outline:3px solid #ffe580;outline-offset:2px;background:#174554}
    .onslaught-loadout-overlay button[aria-pressed=true]{border-color:#ffe580;background:#284337;color:#fff6c9}
    .onslaught-loadout-choices button{min-height:65px;box-shadow:inset 0 1px #c7f8ff1c}
    .onslaught-loadout-choices small,.onslaught-loadout-slots small{display:block;color:#b9d9e7;font:600 13px Rajdhani,Segoe UI,sans-serif;line-height:1.18}
    .onslaught-loadout-category{color:#ffe580;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
    .onslaught-loadout-footer{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:9px;align-items:center;padding-top:12px;border-top:1px solid #496c79}
    .onslaught-loadout-footer p{grid-column:1/-1;margin:0;color:#bad9e6;font-size:14px}
    .onslaught-loadout-footer button{min-width:150px;text-align:center}
    .onslaught-loadout-footer .primary{background:linear-gradient(#72521d,#493514);border:2px solid #ffe29c;color:#fff4c4;box-shadow:inset 0 1px #fff0c355,0 0 18px #ffd36b26;font-weight:800}
    .onslaught-loadout-footer .primary:hover,.onslaught-loadout-footer .primary:focus{background:linear-gradient(#896723,#5d4118);box-shadow:0 0 22px #ffd36b55}
    @media(max-width:760px){.onslaught-loadout-panel{padding:12px;gap:8px}.onslaught-loadout-slots button{min-height:72px}.onslaught-loadout-choices{grid-template-columns:repeat(2,minmax(0,1fr))}.onslaught-loadout-choices button{min-height:60px}.onslaught-loadout-head p{font-size:13px}.onslaught-loadout-ship{grid-template-columns:48px 1fr 48px;gap:5px;padding:6px}.onslaught-loadout-ship button{height:52px}.onslaught-loadout-footer{grid-template-columns:1fr 1fr}.onslaught-loadout-footer button:first-of-type{grid-column:1/-1}.onslaught-loadout-footer button{min-width:0}}
  `;
  overlay.append(style);
  const panel = element('div', 'onslaught-loadout-panel');
  overlay.append(panel);
  const header = element('div', 'onslaught-loadout-head');
  header.append(element('h1', '', t('ONSLAUGHT — CHOOSE YOUR LOADOUT')));
  header.append(element('p', '', t('Choose a ship and three first-level augments. Start at Sector 51 with zero score; earn full career XP from play.')));
  header.append(element('div', 'onslaught-loadout-label', t('SHIP')));
  panel.append(header);
  const shipLine = element('div', 'onslaught-loadout-ship');
  const previousShip = element('button', '', '‹');
  const nextShip = element('button', '', '›');
  previousShip.setAttribute('aria-label', t('PREVIOUS SHIP'));
  nextShip.setAttribute('aria-label', t('NEXT SHIP'));
  const shipIdentity = element('div', 'ship-identity');
  const shipName = element('strong');
  const shipSummary = element('small');
  shipIdentity.append(shipName, shipSummary);
  shipLine.append(previousShip, shipIdentity, nextShip);
  panel.append(shipLine, element('div', 'onslaught-loadout-label', t('STARTING AUGMENTS')));
  const slots = element('div', 'onslaught-loadout-slots');
  panel.append(slots);
  const presetRow = element('div', 'onslaught-loadout-presets');
  panel.append(presetRow);
  const picker = element('div', 'onslaught-loadout-picker');
  const pickerTitle = element('div', 'onslaught-loadout-label');
  const categories = element('div', 'onslaught-loadout-categories');
  const choices = element('div', 'onslaught-loadout-choices');
  picker.append(pickerTitle, categories, choices);
  panel.append(picker);
  const footer = element('div', 'onslaught-loadout-footer');
  const status = element('p', '', t('Select a slot, then choose an augment.'));
  footer.append(status);
  const back = element('button', '', t('BACK'));
  const achievementsButton = element('button', '', t('VIEW ACHIEVEMENTS FOR THIS MODE'));
  const launch = element('button', 'primary', t('LAUNCH ONSLAUGHT'));
  footer.append(achievementsButton, back, launch);
  panel.append(footer);

  let resolvePromise;
  let achievementScene = null;
  let achievementFrame = 0;
  game.onslaughtLoadoutPickerOpen = true;
  game.onslaughtLoadoutPickerPromise = new Promise(resolve => { resolvePromise = resolve; });
  const buttons = [previousShip, nextShip];
  const focus = button => { button?.focus(); button?.scrollIntoView?.({ block: 'nearest' }); };
  const render = () => {
    const ship = getShipMetadata(chosenSpriteKey);
    const role = t(ship?.role || 'Balanced');
    const trait = t(ship?.trait?.label || '');
    shipName.textContent = t(ship?.name || '');
    shipSummary.textContent = trait && trait.toLocaleLowerCase() !== t(ship?.name || '').toLocaleLowerCase()
      ? `${role} · ${trait}`
      : role;
    picker.hidden = !pickerOpen;
    pickerTitle.textContent = `${t('CHOOSE AUGMENT')} ${activeSlot + 1}`;
    [...slots.children].forEach((button, index) => {
      const augment = byId.get(selected[index]);
      button.setAttribute('aria-pressed', String(pickerOpen && index === activeSlot));
      button.innerHTML = '';
      button.append(document.createTextNode(`${index + 1}. ${t(augment?.name || '')}`));
      button.append(element('small', '', t(augment?.draftDescription || '')));
    });
    [...choices.children].forEach((button, index) => {
      button.hidden = augments[index].category !== category;
      button.setAttribute('aria-pressed', String(selected.includes(augments[index].id)));
      button.setAttribute('aria-label', `${t(augments[index].name)}. ${t(augments[index].draftDescription)}. ${t(augments[index].category)}.`);
    });
    [...categories.children].forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
  };
  const closeAchievements = () => {
    if (!achievementScene) return;
    cancelAnimationFrame(achievementFrame);
    achievementScene.destroy();
    achievementScene.container.parent?.removeChild(achievementScene.container);
    achievementScene.container.destroy({ children: true });
    achievementScene = null;
    overlay.style.display = '';
    nav.suppressUntilReleased();
    achievementsButton.focus();
  };
  achievementsButton.onclick = () => {
    if (achievementScene) return;
    game.achievementBrowserMode = RUN_MODES.OVERRUN_TACTICAL;
    game.achievementBrowserAvailableOnly = true;
    overlay.style.display = 'none';
    achievementScene = new AchievementsScene(game, { overlay: true, onClose: closeAchievements });
    game.app.stage.addChild(achievementScene.container);
    achievementScene.init();
    const tickAchievements = () => {
      if (!achievementScene) return;
      achievementScene.update(1);
      achievementFrame = requestAnimationFrame(tickAchievements);
    };
    achievementFrame = requestAnimationFrame(tickAchievements);
  };
  const finish = accepted => {
    if (closed) return;
    closeAchievements();
    closed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('keydown', keys, true);
    overlay.remove();
    if (accepted) {
      editsByShip.set(chosenSpriteKey, [...selected]);
      for (const [key, ids] of editsByShip) saveOnslaughtLoadout(key, ids);
      setSelectedShipKey(chosenSpriteKey);
      try {
        localStorage.setItem('burt.selectedShip.v1', chosenSpriteKey);
        window.__novaSteamCloudDiagnostics?.sync?.();
      } catch { /* The run can still start with the chosen ship. */ }
    }
    else previousFocus?.focus?.();
    game.onslaughtLoadoutPickerOpen = false;
    game.onslaughtLoadoutPickerPromise = null;
    game.currentScene?.menuGamepadNavigator?.suppressUntilReleased();
    game.currentScene?.gamepadNavigator?.suppressUntilReleased();
    resolvePromise(accepted ? { spriteKey: chosenSpriteKey, augmentIds: [...selected] } : null);
  };
  const switchShip = direction => {
    if (unlockedShips.length < 2) return;
    editsByShip.set(chosenSpriteKey, [...selected]);
    const index = unlockedShips.findIndex(ship => ship.spriteKey === chosenSpriteKey);
    chosenSpriteKey = unlockedShips[(index + direction + unlockedShips.length) % unlockedShips.length].spriteKey;
    selected.splice(0, 3, ...(editsByShip.get(chosenSpriteKey) || getSavedOnslaughtLoadout(chosenSpriteKey)));
    activeSlot = 0;
    pickerOpen = false;
    render();
  };
  previousShip.onclick = () => switchShip(-1);
  nextShip.onclick = () => switchShip(1);
  previousShip.disabled = nextShip.disabled = unlockedShips.length < 2;

  selected.forEach((_, index) => {
    const button = element('button', '');
    button.onclick = () => { activeSlot = index; pickerOpen = true; category = byId.get(selected[index])?.category || 'offense'; render(); status.textContent = t('Choose an augment for the selected slot.'); focus(categories.querySelector('button[aria-pressed=true]')); };
    slots.append(button); buttons.push(button);
  });
  for (const preset of ONSLAUGHT_LOADOUT_PRESETS) {
    const button = element('button', '', t(preset.name));
    button.onclick = () => { selected.splice(0, 3, ...preset.augmentIds); activeSlot = 0; pickerOpen = false; render(); status.textContent = t('Preset selected. You can still change any slot.'); };
    presetRow.append(button); buttons.push(button);
  }
  for (const name of ['offense', 'defense', 'mobility', 'utility']) {
    const button = element('button', '', t(name));
    button.dataset.category = name;
    button.onclick = () => { category = name; render(); focus(choices.querySelector('button:not([hidden])')); };
    categories.append(button); buttons.push(button);
  }
  for (const augment of augments) {
    const button = element('button', '');
    button.append(element('span', 'onslaught-loadout-category', t(augment.category)));
    button.append(document.createElement('br'));
    button.append(document.createTextNode(t(augment.name)));
    button.append(element('small', '', t(augment.draftDescription)));
    button.onclick = () => {
      const existing = selected.indexOf(augment.id);
      if (existing >= 0) {
        activeSlot = existing;
        status.textContent = t('Already selected. Choose another augment to replace this slot.');
      } else {
        selected[activeSlot] = augment.id;
        pickerOpen = false;
        status.textContent = t('Loadout ready. Choose another slot or launch.');
      }
      render();
      if (!pickerOpen) {
        const slot = slots.children[activeSlot];
        if (!getAccessibilitySettings().reducedMotion) {
          slot.classList.remove('augment-equipped');
          void slot.offsetWidth;
          slot.classList.add('augment-equipped');
        }
        AudioManager.playSfx('ship_lock_chime', { volume: 0.24, minIntervalMs: 60 });
        focus(slot);
      }
    };
    choices.append(button); buttons.push(button);
  }
  back.onclick = () => finish(false);
  launch.onclick = () => finish(true);
  buttons.push(achievementsButton, back, launch);
  const keys = event => {
    if (achievementScene) return;
    event.stopImmediatePropagation();
    if (event.key === 'Escape') { event.preventDefault(); if (pickerOpen) { pickerOpen = false; render(); focus(slots.children[activeSlot]); } else finish(false); }
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      const visibleButtons = buttons.filter(button => !button.hidden && !button.closest('[hidden]') && !button.disabled);
      focus(visibleButtons[(visibleButtons.indexOf(document.activeElement) + direction + visibleButtons.length) % visibleButtons.length]);
    }
  };
  const poll = () => {
    if (achievementScene) {
      if (!closed) frame = requestAnimationFrame(poll);
      return;
    }
    const pressed = nav.update().pressed;
    if (pressed.cancel || pressed.back) {
      if (pickerOpen) { pickerOpen = false; render(); focus(slots.children[activeSlot]); }
      else finish(false);
    }
    else if (pressed.confirm) document.activeElement?.click?.();
    else if (pressed.left || pressed.up || pressed.right || pressed.down) {
      const direction = pressed.left || pressed.up ? -1 : 1;
      const visibleButtons = buttons.filter(button => !button.hidden && !button.closest('[hidden]') && !button.disabled);
      focus(visibleButtons[(visibleButtons.indexOf(document.activeElement) + direction + visibleButtons.length) % visibleButtons.length]);
    }
    if (!closed) frame = requestAnimationFrame(poll);
  };
  render();
  document.body.append(overlay);
  window.addEventListener('keydown', keys, true);
  focus(nextShip.disabled ? slots.children[0] : nextShip);
  frame = requestAnimationFrame(poll);
  return game.onslaughtLoadoutPickerPromise;
}
