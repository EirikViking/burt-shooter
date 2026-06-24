import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { MUSIC_PACK_OPTIONS } from '../audio/SoundCatalog.js';
import {
  getAccessibilitySettings,
  setColorAssistEnabled,
  setPlayerFocusScale,
  setScreenShakeScale
} from '../config/AccessibilitySettings.js';
import {
  DEFAULT_WINDOW_SIZE_OPTIONS,
  DISPLAY_MODES,
  UI_SCALE_OPTIONS,
  applyDisplaySettings,
  getDisplayOptions,
  getDisplaySettings,
  getUiScaleLabel,
  resetDisplaySettings
} from '../config/DisplaySettings.js';
import { getMenuSettings, saveMenuSettings } from '../config/MenuSettings.js';
import { BUILD_ID } from '../buildInfo.js';
import { createText } from '../utils/pixiText.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import {
  getLanguageOptions,
  getLanguagePreferenceMode,
  onLanguageChange,
  setLanguagePreference,
  translateText
} from '../i18n/index.js';
import { ShipData } from '../config/ShipData.js';
import {
  CREDITS_ASCENDANT_EASTER_EGG_CHANCE,
  CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS,
  CREDITS_ASCENDANT_EASTER_EGG_SHIP_ID,
  grantSecretShipUnlock,
  rollCreditsAscendantEasterEgg
} from '../progression/HangarProgressState.js';
import { destroyMenuFx, installMenuFx, playMenuConfirmSfx, playMenuFocusSfx, updateMenuFx } from './MenuFxLayer.js';
import { applyResponsiveLayout, getCurrentLayout } from './responsiveLayout.js';

function percent(value) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function fitTextToWidth(text, maxWidth, { minScale = 0.68 } = {}) {
  if (!text || !Number.isFinite(maxWidth) || maxWidth <= 0) return 1;
  text.scale.set(1);
  text.updateText?.(false);
  const measuredWidth = text.width || 0;
  const scale = measuredWidth > maxWidth
    ? Math.max(minScale, maxWidth / measuredWidth)
    : 1;
  text.scale.set(scale);
  return scale;
}

function fitDisplayToBox(displayObject, maxWidth, maxHeight, { minScale = 0.72 } = {}) {
  if (!displayObject || !Number.isFinite(maxWidth) || !Number.isFinite(maxHeight) || maxWidth <= 0 || maxHeight <= 0) return 1;
  displayObject.scale.set(1);
  displayObject.updateText?.(false);
  const measuredWidth = displayObject.width || 0;
  const measuredHeight = displayObject.height || 0;
  const scale = measuredWidth > 0 && measuredHeight > 0
    ? Math.min(1, Math.max(minScale, Math.min(maxWidth / measuredWidth, maxHeight / measuredHeight)))
    : 1;
  displayObject.scale.set(scale);
  return scale;
}

function debugBounds(displayObject) {
  if (!displayObject?.getBounds) return null;
  try {
    const bounds = displayObject.getBounds();
    return {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
      right: Math.round(bounds.x + bounds.width),
      bottom: Math.round(bounds.y + bounds.height)
    };
  } catch {
    return null;
  }
}

function getCreditsAscendantRandom() {
  const override = typeof window !== 'undefined'
    ? window.__novaCreditsAscendantEasterEggRandom
    : globalThis.__novaCreditsAscendantEasterEggRandom;
  return typeof override === 'function' ? override : Math.random;
}

function getCreditsRevealShip(shipId = 'nova_ship_07') {
  const fallback = ShipData[6] || ShipData[0] || {};
  const ship = ShipData.find(candidate => candidate.id === shipId) || fallback;
  const textureIndex = Number.isInteger(ship.textureIndex)
    ? ship.textureIndex
    : Math.max(0, Number.parseInt(String(ship.spriteKey || '').replace(/\D/g, ''), 10) - 1);
  return {
    ship,
    name: ship.name || 'QUASAR FAN',
    asset: AssetManifest.generated.playerShips?.[textureIndex]
  };
}

function getMusicPackOption(pack) {
  return MUSIC_PACK_OPTIONS.find((option) => option.id === pack) || MUSIC_PACK_OPTIONS[0];
}

export class SettingsOverlay {
  constructor(game, {
    title = 'SETTINGS',
    onClose = null
  } = {}) {
    this.game = game;
    this.title = title;
    this.onClose = onClose;
    this.container = new PIXI.Container();
    this.container.zIndex = 2000000;
    this.container.label = 'ui_settingsOverlay';
    this.container.sortableChildren = true;
    this.menuFx = null;
    this.rows = [];
    this.draggingSlider = null;
    this.audioTestButtons = {};
    this.musicPackButton = null;
    this.displayModeButton = null;
    this.displaySizeButton = null;
    this.uiScaleButton = null;
    this.confirmExitButton = null;
    this.displayStatusText = null;
    this.displayOptions = {
      modes: DISPLAY_MODES.map((entry) => ({ ...entry, supported: true })),
      sizes: DEFAULT_WINDOW_SIZE_OPTIONS
    };
    this.footerButtons = {};
    this.languageButton = null;
    this.languageHint = null;
    this.creditsPanel = null;
    this.creditsBackButton = null;
    this.creditsCoinButton = null;
    this.creditsControls = [];
    this.creditsFocusedIndex = 0;
    this.creditsDebugState = null;
    this.creditsTicker = null;
    this.creditsRevealTicker = null;
    this.creditsAnimatedNodes = [];
    this.creditsCoinClicks = 0;
    this.creditsEggStatusText = null;
    this.creditsUnlockReveal = null;
    this.controls = [];
    this.focusedControlIndex = 0;
    this.gamepadNavigator = new GamepadNavigator();
    this.gamepadNavigator.suppressUntilReleased();
    this.languageUnsubscribe = onLanguageChange(() => this.rebuild());
    this.keyHandler = null;
    this.build();
    this.refreshDisplayOptions();
    this.setupKeyboardNavigation();
    this.setControlFocus(0);
  }

  build() {
    this.controls = [];
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const requestedUiScale = Math.max(1, Math.min(2, Number(getCurrentLayout()?.uiScale) || 1));
    const viewportScaleCap = Math.max(1, Math.min(2, width / 1400, height / 980));
    this.uiScale = Math.min(requestedUiScale, viewportScaleCap);
    const settings = AudioManager.getSettings();
    const accessibility = getAccessibilitySettings();
    this.container.eventMode = 'static';
    this.container.hitArea = new PIXI.Rectangle(0, 0, width, height);

    const dim = new PIXI.Graphics();
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x020713, alpha: 0.82 });
    dim.eventMode = 'static';
    this.container.addChild(dim);
    installMenuFx(this, {
      label: 'ui_menuFxSettings',
      zIndex: 0,
      accent: 0x7fffd8,
      secondary: 0xff55d9,
      gold: 0xffef7e,
      intensity: 0.6,
      density: 0.68,
      alpha: 0.42,
      openVolume: 0.18
    });

    const isCompact = width < 620 || height < 820;
    const panelWidth = Math.min(680 * this.uiScale, width * 0.9);
    const panelHeight = Math.min((isCompact ? 820 : 900) * this.uiScale, height * (isCompact ? 0.98 : 0.97));
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const panel = new PIXI.Graphics();
    panel.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    panel.fill({ color: 0x06111f, alpha: 0.96 });
    panel.stroke({ color: 0x00ffff, width: 2, alpha: 0.95 });
    this.container.addChild(panel);

    const titleText = createText(this.title, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: Math.round((isCompact ? 28 : 34) * this.uiScale),
      fontWeight: 'bold',
      fill: '#f6fbff',
      stroke: '#003344',
      strokeThickness: 4
    });
    titleText.anchor.set(0.5);
    titleText.position.set(width / 2, panelY + (isCompact ? 42 : 48));
    this.container.addChild(titleText);

    const dense = height < 760;
    const sectionGap = Math.round((dense ? 22 : 26) * this.uiScale);
    const toggleGap = Math.round((dense ? 30 : (isCompact ? 32 : 34)) * this.uiScale);
    const testGap = Math.round((dense ? 30 : (isCompact ? 31 : 34)) * this.uiScale);
    const sliderGap = Math.round((dense ? 31 : (isCompact ? 32 : 34)) * this.uiScale);
    const footerButtonHeight = isCompact ? 32 : 38;
    const stackedButtonWidth = Math.min(240 * this.uiScale, panelWidth - 56);
    let y = panelY + Math.round((dense ? 74 : (isCompact ? 84 : 92)) * this.uiScale);
    this.addSectionLabel('DISPLAY', y);
    y += sectionGap;
    this.addDisplayModeRow('Display Mode', y);
    y += toggleGap;
    this.addDisplaySizeRow('Window Size', y);
    y += testGap;
    this.addUiScaleRow('UI Scale', y);
    y += toggleGap;
    this.addToggleRow('Confirm Exit', getMenuSettings().confirmExit, y, (enabled) => saveMenuSettings({ confirmExit: enabled }), {
      id: 'confirm_exit',
      onButton: (button) => {
        this.confirmExitButton = button;
      }
    });
    y += toggleGap;
    this.addDisplayResetRow('Safe Reset', y);
    y += sectionGap;
    this.addSectionLabel('AUDIO', y);
    y += sectionGap;
    this.addToggleRow('MUSIC', settings.musicEnabled, y, (enabled) => AudioManager.setMusicEnabled(enabled));
    y += toggleGap;
    this.addToggleRow('VOICE', settings.voiceEnabled, y, (enabled) => AudioManager.setVoiceEnabled(enabled));
    y += toggleGap;
    this.addToggleRow('Boss Voices', settings.bossVoiceEnabled, y, (enabled) => AudioManager.setBossVoiceEnabled(enabled));
    y += toggleGap;
    this.addToggleRow('CTA VOICE', settings.ctaVoiceEnabled, y, (enabled) => AudioManager.setCtaVoiceEnabled(enabled));
    y += testGap;
    this.addMusicPackRow('MUSIC SET', settings.musicPack, y);
    y += testGap;
    this.addAudioTestRow('TEST', y);
    y += testGap;
    this.addLanguageRow('LANGUAGE', y);
    y += toggleGap;
    this.addSliderRow('MASTER', 'master', settings.masterVolume, y);
    y += sliderGap;
    this.addSliderRow('MUSIC VOL', 'music', settings.musicVolume, y);
    y += sliderGap;
    this.addSliderRow('SFX VOL', 'sfx', settings.sfxVolume, y);
    y += sliderGap;
    this.addSliderRow('VOICE VOL', 'voice', settings.voiceVolume, y);
    y += sliderGap;
    this.addSliderRow('SHAKE', 'screenShake', accessibility.screenShake, y, {
      onChange: setScreenShakeScale
    });
    y += sliderGap;
    this.addSliderRow('FOCUS', 'playerFocus', accessibility.playerFocus, y, {
      onChange: setPlayerFocusScale
    });
    y += toggleGap;
    this.addToggleRow('COLOR AID', accessibility.colorAssist, y, setColorAssistEnabled);

    const footerY = panelY + panelHeight - (isCompact ? 26 : 38);
    if (panelWidth >= 500) {
      const footerButtonGap = isCompact ? 12 : 16;
      const availableFooterWidth = panelWidth - (isCompact ? 44 : 64);
      const footerButtonWidth = Math.min(isCompact ? 172 : 190, Math.floor((availableFooterWidth - footerButtonGap) / 2));
      const footerStep = footerButtonWidth + footerButtonGap;
      this.addFooterButton('credits', 'CREDITS', width / 2 - footerStep / 2, footerY, () => this.openCreditsPanel(), {
        width: footerButtonWidth,
        height: footerButtonHeight
      });
      this.addFooterButton('close', 'CLOSE', width / 2 + footerStep / 2, footerY, () => this.close(), {
        width: footerButtonWidth,
        height: footerButtonHeight
      });
    } else {
      const stackGap = footerButtonHeight + 8;
      this.addFooterButton('credits', 'CREDITS', width / 2, footerY - stackGap, () => this.openCreditsPanel(), {
        width: stackedButtonWidth,
        height: footerButtonHeight
      });
      this.addFooterButton('close', 'CLOSE', width / 2, footerY, () => this.close(), {
        width: stackedButtonWidth,
        height: footerButtonHeight
      });
    }
  }

  addToggleRow(label, initialValue, y, onChange, { id = null, onButton = null } = {}) {
    const width = this.game.getWidth();
    const row = new PIXI.Container();
    row.position.set(width / 2, y);

    const labelText = createText(translateText(label), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 18,
      fill: '#9befff'
    });
    labelText.anchor.set(1, 0.5);
    labelText.x = -82;
    fitTextToWidth(labelText, 126, { minScale: 0.68 });
    row.addChild(labelText);

    let enabled = Boolean(initialValue);
    const button = this.createButton(enabled ? 'ON' : 'OFF', 78, 0, () => {
      enabled = !enabled;
      onChange(enabled);
      button._label.text = enabled ? 'ON' : 'OFF';
      button._label.style.fill = enabled ? '#ffffff' : '#9fb5c2';
      AudioManager.playSfx('ui_open', { volume: 0.18, minIntervalMs: 80 });
    }, { width: 132, height: 34 });
    button._label.style.fill = enabled ? '#ffffff' : '#9fb5c2';
    onButton?.(button);
    row.addChild(button);
    this.registerControl({
      type: 'button',
      id: `toggle_${id || label.toLowerCase().replace(/\s+/g, '_')}`,
      button,
      label
    });

    this.container.addChild(row);
    this.rows.push(row);
  }

  addAudioTestRow(label, y) {
    const width = this.game.getWidth();
    const row = new PIXI.Container();
    row.position.set(width / 2, y);

    const labelText = createText(label, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 16,
      fill: '#9befff'
    });
    labelText.anchor.set(1, 0.5);
    labelText.x = -154;
    row.addChild(labelText);

    const sfxButton = this.createButton('SFX', -46, 0, () => this.playAudioTest('sfx'), { width: 96, height: 32 });
    const voiceButton = this.createButton('VOICE', 78, 0, () => this.playAudioTest('voice'), { width: 116, height: 32 });
    sfxButton.label = 'ui_settingsTestSfx';
    voiceButton.label = 'ui_settingsTestVoice';
    this.audioTestButtons.sfx = sfxButton;
    this.audioTestButtons.voice = voiceButton;
    row.addChild(sfxButton, voiceButton);
    this.registerControl({ type: 'button', id: 'test_sfx', button: sfxButton, label: 'TEST SFX' });
    this.registerControl({ type: 'button', id: 'test_voice', button: voiceButton, label: 'TEST VOICE' });

    this.container.addChild(row);
    this.rows.push(row);
  }

  playAudioTest(kind) {
    const played = AudioManager.playAuditionCue(kind);
    if (!played && kind === 'voice') {
      AudioManager.playSfx('ui_open', { force: true, volume: 0.18, minIntervalMs: 0 });
    }
    return played;
  }

  addLanguageRow(label, y) {
    const width = this.game.getWidth();
    const row = new PIXI.Container();
    row.position.set(width / 2, y);

    const labelText = createText(label, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 16,
      fill: '#9befff'
    });
    labelText.anchor.set(1, 0.5);
    labelText.x = -154;
    row.addChild(labelText);

    const options = getLanguageOptions();
    let selectedIndex = Math.max(0, options.findIndex((option) => option.value === getLanguagePreferenceMode()));
    const selected = () => options[selectedIndex] || options[0];
    const cycle = async (direction = 1) => {
      selectedIndex = ((selectedIndex + Math.sign(direction || 1)) % options.length + options.length) % options.length;
      const option = selected();
      this.updateLanguageButton(option);
      await setLanguagePreference(option.value);
      AudioManager.playSfx('ui_open', { volume: 0.18, minIntervalMs: 80 });
    };

    const button = this.createButton(selected().label, 18, 0, () => {
      cycle(1).catch((error) => console.warn('[SettingsOverlay] Language change failed:', error));
    }, { width: 170, height: 32 });
    button.label = 'ui_settingsLanguage';
    this.languageButton = button;
    row.addChild(button);

    const hint = createText(selected().hint, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 12,
      fill: '#ffc96e'
    });
    hint.anchor.set(0, 0.5);
    hint.x = 116;
    this.languageHint = hint;
    row.addChild(hint);

    this.container.addChild(row);
    this.rows.push(row);
    this.updateLanguageButton(selected());
    this.registerControl({
      type: 'choice',
      id: 'language',
      button,
      label,
      cycle: (direction) => cycle(direction).catch((error) => console.warn('[SettingsOverlay] Language cycle failed:', error))
    });
  }

  updateLanguageButton(option) {
    if (this.languageButton?._label && option?.label) {
      this.languageButton._label.text = option.label;
      fitTextToWidth(this.languageButton._label, 132);
    }
    if (this.languageHint && option?.hint) {
      this.languageHint.text = option.hint;
      fitTextToWidth(this.languageHint, 118, { minScale: 0.68 });
    }
  }

  addMusicPackRow(label, initialPack, y) {
    const width = this.game.getWidth();
    const row = new PIXI.Container();
    row.position.set(width / 2, y);

    const labelText = createText(label, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 16,
      fill: '#9befff'
    });
    labelText.anchor.set(1, 0.5);
    labelText.x = -154;
    row.addChild(labelText);

    let selectedIndex = Math.max(0, MUSIC_PACK_OPTIONS.findIndex((option) => option.id === initialPack));
    const selected = () => MUSIC_PACK_OPTIONS[selectedIndex] || MUSIC_PACK_OPTIONS[0];
    const button = this.createButton(selected().label, 18, 0, () => cycleMusicPack(1), { width: 170, height: 32 });
    button.label = 'ui_settingsMusicPack';
    this.musicPackButton = button;
    fitTextToWidth(button._label, 132);
    row.addChild(button);

    const hint = createText(translateText(selected().hint), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 12,
      fill: '#ffc96e'
    });
    hint.anchor.set(0, 0.5);
    hint.x = 116;
    row.addChild(hint);

    const updateDisplay = (pack) => {
      const option = getMusicPackOption(pack);
      selectedIndex = Math.max(0, MUSIC_PACK_OPTIONS.findIndex((entry) => entry.id === option.id));
      button._label.text = translateText(option.label);
      fitTextToWidth(button._label, 132);
      hint.text = translateText(option.hint);
      fitTextToWidth(hint, 118, { minScale: 0.68 });
    };
    function cycleMusicPack(direction = 1) {
      selectedIndex = ((selectedIndex + Math.sign(direction || 1)) % MUSIC_PACK_OPTIONS.length + MUSIC_PACK_OPTIONS.length) % MUSIC_PACK_OPTIONS.length;
      const settings = AudioManager.setMusicPack(selected().id);
      updateDisplay(settings.musicPack);
      AudioManager.playSfx('ui_open', { volume: 0.18, minIntervalMs: 80 });
    }
    updateDisplay(initialPack);
    this.registerControl({
      type: 'choice',
      id: 'music_pack',
      button,
      label: 'MUSIC SET',
      cycle: cycleMusicPack
    });

    this.container.addChild(row);
    this.rows.push(row);
  }

  addSliderRow(label, kind, initialValue, y, { onChange = null } = {}) {
    const width = this.game.getWidth();
    const row = new PIXI.Container();
    row.position.set(width / 2, y);

    const labelText = createText(label, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 16,
      fill: '#9befff'
    });
    labelText.anchor.set(1, 0.5);
    labelText.x = -154;
    row.addChild(labelText);

    const trackWidth = 250;
    const track = new PIXI.Graphics();
    const knob = new PIXI.Graphics();
    const focus = new PIXI.Graphics();
    const valueText = createText(percent(initialValue), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 15,
      fill: '#ffffff'
    });
    valueText.anchor.set(0, 0.5);
    valueText.x = 160;
    row.addChild(focus, track, knob, valueText);
    let sliderEntry = null;

    const draw = (value) => {
      const clamped = Math.max(0, Math.min(1, value));
      focus.clear();
      if (sliderEntry?.focused) {
        focus.roundRect(-trackWidth / 2 - 18, -18, trackWidth + 104, 36, 8);
        focus.stroke({ color: 0xffef7e, width: 2, alpha: 0.86 });
      }
      track.clear();
      track.roundRect(-trackWidth / 2, -5, trackWidth, 10, 5);
      track.fill({ color: 0x11354a, alpha: 0.95 });
      track.roundRect(-trackWidth / 2, -5, trackWidth * clamped, 10, 5);
      track.fill({ color: 0x00d8ff, alpha: 0.95 });
      knob.clear();
      knob.circle(-trackWidth / 2 + trackWidth * clamped, 0, 10);
      knob.fill({ color: 0xf6fbff, alpha: 1 });
      knob.stroke({ color: 0x00ffff, width: 2 });
      valueText.text = percent(clamped);
    };

    const applyValue = (value) => {
      const nextValue = onChange
        ? onChange(value)
        : AudioManager.setVolume(kind, value)[`${kind}Volume`];
      const applied = Math.max(0, Math.min(1, Number.isFinite(nextValue) ? nextValue : value));
      if (sliderEntry) sliderEntry.value = applied;
      draw(applied);
      AudioManager.playSfx('ui_open', { volume: 0.1, minIntervalMs: 90 });
      return applied;
    };

    const setFromGlobal = (globalX) => {
      const local = row.toLocal({ x: globalX, y });
      const value = (local.x + trackWidth / 2) / trackWidth;
      applyValue(value);
    };

    track.eventMode = 'static';
    track.cursor = 'pointer';
    knob.eventMode = 'static';
    knob.cursor = 'pointer';
    const startDrag = (event) => {
      this.draggingSlider = { setFromGlobal };
      setFromGlobal(event.global.x);
      AudioManager.playSfx('ui_open', { volume: 0.12, minIntervalMs: 120 });
    };
    track.on('pointerdown', startDrag);
    knob.on('pointerdown', startDrag);
    this.container.on('pointermove', (event) => {
      if (this.draggingSlider?.setFromGlobal === setFromGlobal) {
        setFromGlobal(event.global.x);
      }
    });
    this.container.on('pointerup', () => {
      if (this.draggingSlider?.setFromGlobal === setFromGlobal) this.draggingSlider = null;
    });
    this.container.on('pointerupoutside', () => {
      if (this.draggingSlider?.setFromGlobal === setFromGlobal) this.draggingSlider = null;
    });

    draw(initialValue);
    this.container.addChild(row);
    this.rows.push(row);
    sliderEntry = this.registerControl({
      type: 'slider',
      id: `slider_${kind}`,
      row,
      label,
      value: Math.max(0, Math.min(1, Number(initialValue) || 0)),
      setValue: applyValue,
      redraw: () => draw(sliderEntry?.value ?? initialValue)
    });
  }

  createButton(label, x, y, onPress, { width = 240, height = 38 } = {}) {
    const controlScale = Math.max(1, Math.min(2, Number(this.uiScale) || 1));
    width = Math.round(width * controlScale);
    height = Math.round(height * controlScale);
    const button = new PIXI.Container();
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.position.set(x, y);
    button.hitArea = new PIXI.Rectangle(-width / 2, -height / 2, width, height);
    button.activate = onPress;

    const focus = new PIXI.Graphics();
    const bg = new PIXI.Graphics();
    button.addChild(focus, bg);

    const text = createText(translateText(label), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 17,
      fontWeight: 'bold',
      fill: '#ffffff'
    });
    text.anchor.set(0.5);
    fitTextToWidth(text, width - 18, { minScale: 0.72 });
    button.addChild(text);
    button._label = text;

    const draw = (hovered = false) => {
      focus.clear();
      if (button._focused) {
        focus.roundRect(-width / 2 - 5, -height / 2 - 5, width + 10, height + 10, 8);
        focus.stroke({ color: 0xffef7e, width: 2, alpha: 0.86 });
      }
      bg.clear();
      bg.roundRect(-width / 2, -height / 2, width, height, 6);
      bg.fill({ color: hovered ? 0x0b6f8f : 0x07334e, alpha: hovered ? 0.95 : 0.84 });
      bg.stroke({ color: hovered ? 0xffffff : 0x00ffff, width: hovered ? 2 : 1, alpha: 0.95 });
    };
    draw(false);
    button._drawButton = draw;

    button.on('pointerover', () => {
      this.setControlFocusByButton(button);
      playMenuFocusSfx(0.09);
      draw(true);
    });
    button.on('pointerout', () => draw(false));
    button.on('pointertap', () => {
      playMenuConfirmSfx(0.14);
      this.menuFx?.burst?.(button.parent ? button.parent.x + button.x : button.x, button.parent ? button.parent.y + button.y : button.y, {
        color: 0x7fffd8,
        radius: 72,
        durationMs: 380
      });
      onPress?.();
    });
    return button;
  }

  addSectionLabel(label, y) {
    const width = this.game.getWidth();
    const text = createText(translateText(label), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 14,
      fontWeight: '900',
      fill: '#ffef7e',
      letterSpacing: 0
    });
    text.anchor.set(0.5);
    text.position.set(width / 2, y);
    fitTextToWidth(text, Math.min(420, this.game.getWidth() - 72), { minScale: 0.74 });
    this.container.addChild(text);
  }

  getAvailableDisplayModes() {
    const current = getDisplaySettings().mode;
    const options = Array.isArray(this.displayOptions?.modes) ? this.displayOptions.modes : [];
    const supportedIds = options
      .filter((entry) => entry?.supported !== false || entry?.id === current)
      .map((entry) => entry.id);
    const ids = supportedIds.length ? supportedIds : DISPLAY_MODES.map((entry) => entry.id);
    return DISPLAY_MODES.filter((entry) => ids.includes(entry.id));
  }

  getWindowSizeOptions() {
    const options = Array.isArray(this.displayOptions?.sizes) && this.displayOptions.sizes.length
      ? this.displayOptions.sizes
      : DEFAULT_WINDOW_SIZE_OPTIONS;
    return options;
  }

  getModeLabel(mode) {
    return translateText(DISPLAY_MODES.find((entry) => entry.id === mode)?.label || 'Windowed');
  }

  getSizeLabel(size) {
    const clean = size || getDisplaySettings().windowSize;
    const label = String(clean.label || '').trim();
    const sizeText = `${Math.round(clean.width)} x ${Math.round(clean.height)}`;
    if (label.startsWith('Native')) return translateText('Native {size}', { size: sizeText });
    if (label.startsWith('Current')) return translateText('Current {size}', { size: sizeText });
    return sizeText;
  }

  setDisplayStatus(message, vars = {}) {
    if (!this.displayStatusText) return;
    this.displayStatusText.text = translateText(message, vars);
    fitTextToWidth(this.displayStatusText, 300, { minScale: 0.65 });
  }

  updateDisplayControls() {
    const settings = getDisplaySettings();
    if (this.displayModeButton?._label) {
      this.displayModeButton._label.text = this.getModeLabel(settings.mode);
      fitTextToWidth(this.displayModeButton._label, 174);
    }
    if (this.displaySizeButton?._label) {
      this.displaySizeButton._label.text = this.getSizeLabel(settings.windowSize);
      fitTextToWidth(this.displaySizeButton._label, 174);
    }
    if (this.uiScaleButton?._label) {
      this.uiScaleButton._label.text = getUiScaleLabel(settings.uiScale);
      fitTextToWidth(this.uiScaleButton._label, 174);
    }
  }

  async refreshDisplayOptions() {
    try {
      this.displayOptions = await getDisplayOptions();
      this.updateDisplayControls();
    } catch (error) {
      console.warn('[SettingsOverlay] Display options unavailable:', error);
    }
  }

  async applyDisplayUpdate(settings, status = 'Display changes applied') {
    const result = await applyDisplaySettings(settings);
    applyResponsiveLayout(window.innerWidth, window.innerHeight);
    this.updateDisplayControls();
    this.setDisplayStatus(result?.ok ? status : 'Browser display fallback active');
    AudioManager.playSfx('ui_open', { volume: 0.18, minIntervalMs: 80 });
    return result;
  }

  addDisplayModeRow(label, y) {
    const settings = getDisplaySettings();
    this.addChoiceRow(label, this.getModeLabel(settings.mode), y, async (direction = 1) => {
      const modes = this.getAvailableDisplayModes();
      const currentIndex = Math.max(0, modes.findIndex((entry) => entry.id === getDisplaySettings().mode));
      const next = modes[((currentIndex + Math.sign(direction || 1)) % modes.length + modes.length) % modes.length];
      await this.applyDisplayUpdate({ ...getDisplaySettings(), mode: next.id });
    }, {
      id: 'display_mode',
      buttonWidth: 222,
      onButton: (button) => {
        this.displayModeButton = button;
      }
    });
  }

  addDisplaySizeRow(label, y) {
    const settings = getDisplaySettings();
    this.addChoiceRow(label, this.getSizeLabel(settings.windowSize), y, async (direction = 1) => {
      const sizes = this.getWindowSizeOptions();
      const current = getDisplaySettings().windowSize;
      const currentIndex = Math.max(0, sizes.findIndex((entry) => entry.width === current.width && entry.height === current.height));
      const next = sizes[((currentIndex + Math.sign(direction || 1)) % sizes.length + sizes.length) % sizes.length];
      await this.applyDisplayUpdate({ ...getDisplaySettings(), mode: 'windowed', windowSize: next }, 'Window size applied');
    }, {
      id: 'display_size',
      buttonWidth: 222,
      onButton: (button) => {
        this.displaySizeButton = button;
      }
    });
  }

  addUiScaleRow(label, y) {
    const settings = getDisplaySettings();
    this.addChoiceRow(label, getUiScaleLabel(settings.uiScale), y, async (direction = 1) => {
      const current = getDisplaySettings().uiScale;
      const currentIndex = Math.max(0, UI_SCALE_OPTIONS.findIndex((entry) => entry === current));
      const next = UI_SCALE_OPTIONS[((currentIndex + Math.sign(direction || 1)) % UI_SCALE_OPTIONS.length + UI_SCALE_OPTIONS.length) % UI_SCALE_OPTIONS.length];
      await this.applyDisplayUpdate({ ...getDisplaySettings(), uiScale: next }, 'UI scale applied');
      this.rebuild();
    }, {
      id: 'ui_scale',
      buttonWidth: 222,
      onButton: (button) => {
        this.uiScaleButton = button;
      }
    });
  }

  addDisplayResetRow(label, y) {
    const width = this.game.getWidth();
    const row = new PIXI.Container();
    row.position.set(width / 2, y);

    const buttonX = -Math.round(60 * this.uiScale);
    const buttonWidth = 168;
    const button = this.createButton(label, buttonX, 0, async () => {
      const settings = resetDisplaySettings();
      await this.applyDisplayUpdate(settings, 'Safe display reset applied');
    }, { width: buttonWidth, height: 30 });
    row.addChild(button);

    const status = createText(translateText('Display changes apply immediately'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 12,
      fill: '#ffc96e'
    });
    status.anchor.set(0, 0.5);
    status.x = buttonX + (buttonWidth * this.uiScale) / 2 + 24;
    this.displayStatusText = status;
    row.addChild(status);

    this.container.addChild(row);
    this.rows.push(row);
    this.registerControl({ type: 'button', id: 'display_reset', button, label });
  }

  addChoiceRow(label, valueLabel, y, onCycle, { id, buttonWidth = 190, onButton = null } = {}) {
    const width = this.game.getWidth();
    const row = new PIXI.Container();
    row.position.set(width / 2, y);

    const labelText = createText(translateText(label), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 16,
      fill: '#9befff'
    });
    labelText.anchor.set(1, 0.5);
    labelText.x = -154;
    fitTextToWidth(labelText, 132, { minScale: 0.7 });
    row.addChild(labelText);

    const cycle = (direction = 1) => {
      Promise.resolve(onCycle?.(direction)).catch((error) => console.warn('[SettingsOverlay] Choice update failed:', error));
    };
    const button = this.createButton(valueLabel, 34, 0, () => cycle(1), { width: buttonWidth, height: 32 });
    button.label = `ui_settings_${id}`;
    row.addChild(button);
    onButton?.(button);

    this.container.addChild(row);
    this.rows.push(row);
    this.registerControl({
      type: 'choice',
      id,
      button,
      label,
      cycle
    });
  }

  addFooterButton(key, label, x, y, onPress, options) {
    const button = this.createButton(label, x, y, onPress, options);
    button.label = `ui_settingsFooter_${key}`;
    this.footerButtons[key] = button;
    this.container.addChild(button);
    this.registerControl({ type: 'button', id: `footer_${key}`, button, label });
    return button;
  }

  registerControl(control) {
    const entry = {
      ...control,
      focused: false
    };
    this.controls.push(entry);
    return entry;
  }

  setControlFocusByButton(button) {
    const index = this.controls.findIndex((control) => control.button === button);
    if (index >= 0) this.setControlFocus(index);
  }

  setControlFocus(index) {
    if (!this.controls.length) return;
    const count = this.controls.length;
    const next = ((index % count) + count) % count;
    const changed = next !== this.focusedControlIndex;
    this.controls.forEach((control, controlIndex) => {
      control.focused = controlIndex === next;
      if (control.button) {
        control.button._focused = control.focused;
        control.button._drawButton?.(false);
      }
      if (control.type === 'slider') {
        control.redraw?.();
      }
    });
    this.focusedControlIndex = next;
    if (changed) playMenuFocusSfx(0.08);
  }

  getFocusedControl() {
    return this.controls[this.focusedControlIndex] || null;
  }

  moveControlFocus(delta) {
    this.setControlFocus(this.focusedControlIndex + delta);
    AudioManager.playSfx('thrusterFire', { volume: 0.07, minIntervalMs: 80 });
  }

  activateFocusedControl() {
    const control = this.getFocusedControl();
    if (!control) return;
    if (control.type === 'slider') {
      this.adjustFocusedControl(1);
      return;
    }
    if (control.type === 'choice') {
      control.cycle?.(1);
      return;
    }
    control.button?.activate?.();
  }

  adjustFocusedControl(direction) {
    const control = this.getFocusedControl();
    if (!control) return false;
    if (control.type === 'choice') {
      control.cycle?.(direction);
      return true;
    }
    if (control.type !== 'slider') {
      this.moveControlFocus(direction > 0 ? 1 : -1);
      return true;
    }
    const step = control.id === 'slider_screenShake' || control.id === 'slider_playerFocus' ? 0.05 : 0.08;
    control.setValue?.((Number(control.value) || 0) + step * Math.sign(direction || 1));
    return true;
  }

  setupKeyboardNavigation() {
    this.keyHandler = (event) => {
      const key = event.key || event.code;
      const handled = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Escape'].includes(key) ||
        event.code === 'Space';
      if (!handled) return;

      event.preventDefault();
      event.stopPropagation();
      if (key === 'Escape') {
        if (this.creditsPanel) this.closeCreditsPanel();
        else this.close();
        return;
      }
      if (key === 'ArrowUp') this.moveControlFocus(-1);
      else if (key === 'ArrowDown') this.moveControlFocus(1);
      else if (key === 'ArrowLeft') this.adjustFocusedControl(-1);
      else if (key === 'ArrowRight') this.adjustFocusedControl(1);
      else this.activateFocusedControl();
    };
    window.addEventListener('keydown', this.keyHandler, true);
  }

  rebuild() {
    const focusedId = this.getFocusedControl()?.id || null;
    this.closeCreditsPanel();
    const children = this.container.removeChildren();
    children.forEach((child) => child?.destroy?.({ children: true }));
    this.menuFx = null;
    this.rows = [];
    this.draggingSlider = null;
    this.audioTestButtons = {};
    this.musicPackButton = null;
    this.displayModeButton = null;
    this.displaySizeButton = null;
    this.uiScaleButton = null;
    this.confirmExitButton = null;
    this.footerButtons = {};
    this.languageButton = null;
    this.languageHint = null;
    this.creditsPanel = null;
    this.creditsBackButton = null;
    this.creditsCoinButton = null;
    this.creditsControls = [];
    this.creditsFocusedIndex = 0;
    this.creditsDebugState = null;
    this.creditsAnimatedNodes = [];
    this.creditsRevealTicker = null;
    this.creditsCoinClicks = 0;
    this.creditsEggStatusText = null;
    this.creditsUnlockReveal = null;
    this.build();
    const nextIndex = Math.max(0, this.controls.findIndex((control) => control.id === focusedId));
    this.setControlFocus(nextIndex);
  }

  update(delta = 1) {
    updateMenuFx(this, delta);
    const nav = this.gamepadNavigator.update();
    if (!nav.connected || !nav.active) return;

    if (this.creditsPanel) {
      if (nav.pressed.cancel || nav.pressed.menu || nav.pressed.back) {
        this.closeCreditsPanel();
        return;
      }
      if (nav.pressed.up || nav.pressed.left) this.moveCreditsFocus(-1);
      if (nav.pressed.down || nav.pressed.right) this.moveCreditsFocus(1);
      if (nav.pressed.confirm) this.activateCreditsFocus();
      return;
    }

    if (nav.pressed.cancel || nav.pressed.menu || nav.pressed.back) {
      this.close();
      return;
    }
    if (nav.pressed.up) this.moveControlFocus(-1);
    if (nav.pressed.down) this.moveControlFocus(1);
    if (nav.pressed.left) this.adjustFocusedControl(-1);
    if (nav.pressed.right) this.adjustFocusedControl(1);
    if (nav.pressed.confirm) this.activateFocusedControl();
  }

  openCreditsPanel() {
    this.closeCreditsPanel();

    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const isCompact = width < 820 || height < 760;
    const isTinyCredits = isCompact && height < 680;
    const panelWidth = Math.min(isCompact ? width * 0.92 : 1120, width * 0.88);
    const panelHeight = Math.min(isCompact ? height * 0.9 : 720, height * 0.88);
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;
    const margin = isCompact ? 22 : 42;
    const headerHeight = isCompact ? 132 : 122;
    const footerHeight = isCompact ? 70 : 82;
    const contentTop = panelY + headerHeight;
    const contentBottom = panelY + panelHeight - footerHeight;
    const contentHeight = Math.max(180, contentBottom - contentTop);
    const buttonY = panelY + panelHeight - (isCompact ? 34 : 42);

    const overlay = new PIXI.Container();
    overlay.zIndex = 1000;
    overlay.label = 'ui_creditsPanel';
    overlay.eventMode = 'static';
    overlay.hitArea = new PIXI.Rectangle(0, 0, width, height);

    this.creditsAnimatedNodes = [];
    this.creditsCoinClicks = 0;

    const dim = new PIXI.Graphics();
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x00040b, alpha: 0.94 });
    dim.eventMode = 'static';
    overlay.addChild(dim);

    const skyline = this.createCreditsImageLayer({
      x: 0,
      y: 0,
      width,
      height,
      alpha: 0.18,
      focusX: 0.5
    });
    skyline.label = 'ui_creditsFullBleedArt';
    overlay.addChild(skyline);

    const starfield = new PIXI.Graphics();
    for (let i = 0; i < 80; i += 1) {
      const px = (i * 137) % Math.max(1, width);
      const py = (i * 73) % Math.max(1, height);
      starfield.circle(px, py, 1 + (i % 3) * 0.8);
      starfield.fill({ color: i % 2 ? 0x37f5ff : 0xffd15c, alpha: 0.08 + (i % 4) * 0.025 });
    }
    overlay.addChild(starfield);
    this.creditsAnimatedNodes.push({ node: starfield, kind: 'drift', baseX: 0, baseY: 0, speed: 0.16 });

    const panel = new PIXI.Graphics();
    panel.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    panel.fill({ color: 0x06111f, alpha: 0.985 });
    panel.stroke({ color: 0xff55d9, width: 2, alpha: 0.98 });
    panel.roundRect(panelX + 10, panelY + 10, panelWidth - 20, panelHeight - 20, 6);
    panel.stroke({ color: 0x37f5ff, width: 1, alpha: 0.34 });
    panel.rect(panelX + 28, panelY + 24, panelWidth - 56, 2);
    panel.fill({ color: 0x7fffd8, alpha: 0.32 });
    panel.rect(panelX + 28, panelY + panelHeight - 28, panelWidth - 56, 2);
    panel.fill({ color: 0xffd15c, alpha: 0.34 });
    overlay.addChild(panel);

    const title = createText(translateText('CREDITS: THE CABINET DENIES EVERYTHING'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: isCompact ? 20 : 30,
      fontWeight: 'bold',
      fill: '#f6fbff',
      stroke: '#3a0635',
      strokeThickness: 4,
      align: 'center'
    });
    title.anchor.set(0.5);
    title.position.set(width / 2, panelY + (isCompact ? 32 : 46));
    fitTextToWidth(title, panelWidth - margin * 2, { minScale: 0.54 });
    overlay.addChild(title);

    const subtitle = createText(translateText('A Tinyfoundry Games incident report, heavily denied by Mission Control.'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: isCompact ? 12 : 16,
      fontWeight: '700',
      fill: '#ffd15c',
      stroke: '#020711',
      strokeThickness: 3,
      wordWrap: true,
      wordWrapWidth: panelWidth - margin * 2,
      align: 'center'
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(width / 2, title.y + (isCompact ? 22 : 31));
    overlay.addChild(subtitle);

    const artRect = isCompact
      ? {
          x: panelX + margin,
          y: contentTop,
          width: panelWidth - margin * 2,
          height: Math.min(isTinyCredits ? 86 : 150, contentHeight * (isTinyCredits ? 0.27 : 0.34))
        }
      : { x: panelX + margin, y: contentTop, width: Math.min(380, panelWidth * 0.36), height: contentHeight };
    const art = this.createCreditsSpectacle(artRect, isCompact);
    overlay.addChild(art);

    const bodyX = isCompact ? panelX + margin : artRect.x + artRect.width + 36;
    const bodyY = isCompact ? artRect.y + artRect.height + (isTinyCredits ? 14 : 18) : contentTop + 2;
    const bodyWidth = isCompact ? panelWidth - margin * 2 : panelX + panelWidth - margin - bodyX;
    const eggRowY = buttonY - (isCompact ? 92 : 96);
    const footerY = eggRowY - (isCompact ? 42 : 48);
    const bodyHeight = Math.max(isTinyCredits ? 92 : (isCompact ? 130 : 178), footerY - bodyY - (isTinyCredits ? 12 : 18));
    const bodyWash = new PIXI.Graphics();
    bodyWash.roundRect(
      bodyX - 16,
      bodyY - 16,
      bodyWidth + 32,
      bodyHeight + 30,
      8
    );
    bodyWash.fill({ color: 0x020711, alpha: 0.72 });
    overlay.addChild(bodyWash);
    const creditsCopy = [
      translateText('Tinyfoundry Games: legally responsible for the explosions, emotionally responsible for the coins.'),
      translateText('Mission Control: sarcasm department, panic reduction unit, snack custody office.'),
      translateText('The Cabinet Ghost: unpaid intern, paid in quarters, promoted after haunting the balance spreadsheet.'),
      translateText('The Swarm: hostile geometry with suspicious timing and absolutely no respect for personal space.'),
      translateText('Boss Scheduler: dramatic entrances, unsafe lasers, one tractor-beam apology note.'),
      translateText('Popcorn Formation Union: filed fourteen complaints. The pilot dodged all of them.'),
      translateText('You: pilot, auditor, apocalypse consultant, and apparently the only adult near the coin slot.'),
      `${translateText('Build')}: ${BUILD_ID}`
    ].join('\n');
    const body = createText(creditsCopy, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: isTinyCredits ? 9 : (isCompact ? 11 : 16),
      fill: '#c9f6ff',
      lineHeight: isTinyCredits ? 12 : (isCompact ? 15 : 22),
      fontWeight: '700',
      wordWrap: true,
      wordWrapWidth: bodyWidth,
      align: 'left'
    });
    body.anchor.set(0, 0);
    body.position.set(bodyX, bodyY);
    fitDisplayToBox(body, bodyWidth, bodyHeight, { minScale: isTinyCredits ? 0.64 : (isCompact ? 0.78 : 0.86) });
    overlay.addChild(body);

    const footer = createText(translateText('No cabinets were harmed. One cabinet was promoted to lore compliance.'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: isCompact ? 11 : 14,
      fontWeight: '800',
      fill: '#ffb9ef',
      wordWrap: true,
      wordWrapWidth: isCompact ? panelWidth - margin * 2 : bodyWidth,
      align: 'center'
    });
    footer.anchor.set(0.5, 1);
    footer.position.set(isCompact ? width / 2 : bodyX + bodyWidth / 2, footerY);
    fitTextToWidth(footer, isCompact ? panelWidth - margin * 2 : bodyWidth, { minScale: 0.78 });
    overlay.addChild(footer);

    const coin = this.createCreditsCoinButton(
      isCompact ? panelX + panelWidth - 58 : bodyX + bodyWidth - 42,
      eggRowY,
      isCompact
    );
    coin.activate = () => this.triggerCreditsEasterEgg(coin);
    overlay.addChild(coin);
    this.creditsCoinButton = coin;

    const eggStatus = createText(translateText('Cabinet seal idle. Totally normal. Probably.'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: isCompact ? 10 : 13,
      fontWeight: '900',
      fill: '#9cfbff',
      stroke: '#020711',
      strokeThickness: 3,
      wordWrap: true,
      wordWrapWidth: isCompact ? Math.min(220, panelWidth - margin * 2) : 310,
      align: 'right'
    });
    eggStatus.anchor.set(1, 0.5);
    eggStatus.position.set(coin.x - (isCompact ? 38 : 48), coin.y);
    fitDisplayToBox(eggStatus, Math.max(120, (isCompact ? panelWidth - margin * 2 : bodyWidth) - 88), isCompact ? 46 : 52, { minScale: 0.66 });
    overlay.addChild(eggStatus);
    this.creditsEggStatusText = eggStatus;

    const backButton = this.createButton('BACK TO CABINET', width / 2, buttonY, () => this.closeCreditsPanel(), {
      width: isCompact ? Math.min(260, panelWidth - margin * 2) : 280,
      height: isCompact ? 34 : 38
    });
    backButton.activate = () => this.closeCreditsPanel();
    overlay.addChild(backButton);
    this.creditsBackButton = backButton;
    this.creditsControls = [coin, backButton];
    this.setCreditsFocus(1);
    this.creditsPanel = overlay;
    this.creditsDebugState = {
      panel: { x: Math.round(panelX), y: Math.round(panelY), width: Math.round(panelWidth), height: Math.round(panelHeight) },
      title: debugBounds(title),
      subtitle: debugBounds(subtitle),
      art: {
        x: Math.round(artRect.x),
        y: Math.round(artRect.y),
        width: Math.round(artRect.width),
        height: Math.round(artRect.height),
        right: Math.round(artRect.x + artRect.width),
        bottom: Math.round(artRect.y + artRect.height)
      },
      body: debugBounds(body),
      footer: debugBounds(footer),
      coin: debugBounds(coin),
      eggStatus: debugBounds(eggStatus),
      backButton: debugBounds(backButton)
    };
    this.container.addChild(overlay);
    this.startCreditsAnimation();
    AudioManager.playSfx('ui_open', { volume: 0.16, minIntervalMs: 120 });
    AudioManager.playVoice?.('mission_control_credits', {
      force: true,
      volume: 0.9,
      duckFactor: 0.34,
      duckMs: 3600,
      cooldownMs: 0
    });
  }

  createCreditsCoinButton(x, y, isCompact = false) {
    const button = new PIXI.Container();
    button.label = 'ui_creditsCabinetSeal';
    button.position.set(x, y);
    button.eventMode = 'static';
    button.cursor = 'pointer';
    const radius = isCompact ? 21 : 27;
    button.hitArea = new PIXI.Circle(0, 0, radius + 8);

    const glow = new PIXI.Graphics();
    const face = new PIXI.Graphics();
    const text = createText(translateText('INSERT COIN'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: isCompact ? 8 : 10,
      fontWeight: '900',
      fill: '#fff3a2',
      stroke: '#020711',
      strokeThickness: 3,
      align: 'center'
    });
    text.anchor.set(0.5);
    text.y = radius + (isCompact ? 16 : 18);

    const draw = (armed = false) => {
      const focused = Boolean(button._focused);
      const highlighted = armed || focused;
      glow.clear();
      face.clear();
      glow.circle(0, 0, radius + (highlighted ? 10 : 7));
      glow.fill({ color: highlighted ? 0xff55d9 : 0x37f5ff, alpha: highlighted ? 0.18 : 0.1 });
      face.circle(0, 0, radius);
      face.fill({ color: highlighted ? 0x2a1744 : 0x201703, alpha: 0.94 });
      face.stroke({ color: focused ? 0xffffff : highlighted ? 0xff55d9 : 0xffd15c, width: highlighted ? 3 : 2, alpha: 0.95 });
      face.circle(0, 0, radius * 0.58);
      face.stroke({ color: 0x7fffd8, width: 1, alpha: 0.82 });
      face.moveTo(-radius * 0.45, 0);
      face.lineTo(radius * 0.45, 0);
      face.stroke({ color: 0xffef7e, width: 2, alpha: 0.92 });
      face.moveTo(0, -radius * 0.45);
      face.lineTo(0, radius * 0.45);
      face.stroke({ color: 0xffef7e, width: 2, alpha: 0.68 });
    };
    draw(false);
    button.addChild(glow, face, text);
    button._drawCoin = draw;

    button.on('pointerover', () => {
      this.setCreditsFocusByButton(button);
      button._drawCoin?.(true);
      AudioManager.playSfx('thrusterFire', { volume: 0.06, minIntervalMs: 120 });
    });
    button.on('pointerout', () => button._drawCoin?.(false));
    button.on('pointertap', () => button.activate?.());
    this.creditsAnimatedNodes.push({ node: button, kind: 'pulse', baseScale: 1, speed: 3.2 });
    return button;
  }

  setCreditsFocusByButton(button) {
    const index = this.creditsControls.findIndex((control) => control === button);
    if (index >= 0) this.setCreditsFocus(index);
  }

  setCreditsFocus(index) {
    if (!this.creditsControls.length) return;
    const count = this.creditsControls.length;
    const next = ((index % count) + count) % count;
    this.creditsControls.forEach((control, controlIndex) => {
      control._focused = controlIndex === next;
      control._drawButton?.(false);
      control._drawCoin?.(false);
    });
    this.creditsFocusedIndex = next;
  }

  moveCreditsFocus(delta) {
    this.setCreditsFocus(this.creditsFocusedIndex + delta);
    AudioManager.playSfx('thrusterFire', { volume: 0.06, minIntervalMs: 90 });
  }

  activateCreditsFocus() {
    this.creditsControls[this.creditsFocusedIndex]?.activate?.();
  }

  triggerCreditsEasterEgg(coinButton) {
    this.creditsCoinClicks += 1;
    const needed = Math.max(0, 3 - this.creditsCoinClicks);
    AudioManager.playSfx(needed > 0 ? 'powerup' : 'nova_bonus_core_jackpot', {
      force: true,
      volume: needed > 0 ? 0.28 : 0.48,
      minIntervalMs: 0
    });
    coinButton.rotation += 0.32;

    if (needed > 0) {
      if (this.creditsEggStatusText) {
        this.creditsEggStatusText.text = translateText('Cabinet seal warming. {count} more coin reports required.', { count: needed });
      }
      return;
    }

    const result = grantSecretShipUnlock('nova_ship_07', { source: 'credits_easter_egg' });
    const ascendantRoll = rollCreditsAscendantEasterEgg({ random: getCreditsAscendantRandom() });
    const revealResult = ascendantRoll.unlocked ? ascendantRoll : result;
    if (this.creditsEggStatusText) {
      this.creditsEggStatusText.text = translateText(
        ascendantRoll.unlocked
          ? 'Ascendant signal answered: Eirik the Viking is ready in the hangar.'
          : result.unlocked
          ? 'Cabinet Ghost waiver filed: Quasar Fan is ready in the hangar.'
          : 'Cabinet Ghost already signed this waiver. Quasar Fan remains suspiciously ready.'
      );
      this.creditsEggStatusText.style.fill = '#fff3a2';
    }
    coinButton._drawCoin?.(true);
    this.showCreditsShipUnlockReveal(revealResult);
    this.creditsDebugState = {
      ...(this.creditsDebugState || {}),
      easterEgg: {
        clicks: this.creditsCoinClicks,
        shipId: 'nova_ship_07',
        unlocked: Boolean(result.unlocked),
        alreadyUnlocked: Boolean(result.alreadyUnlocked),
        ascendant: {
          shipId: CREDITS_ASCENDANT_EASTER_EGG_SHIP_ID,
          chance: CREDITS_ASCENDANT_EASTER_EGG_CHANCE,
          maxAttempts: CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS,
          attempted: Boolean(ascendantRoll.attempted),
          attempts: ascendantRoll.attempts,
          attemptsRemaining: ascendantRoll.attemptsRemaining,
          success: Boolean(ascendantRoll.success),
          unlocked: Boolean(ascendantRoll.unlocked),
          alreadyUnlocked: Boolean(ascendantRoll.alreadyUnlocked),
          exhausted: Boolean(ascendantRoll.exhausted)
        }
      }
    };
  }

  showCreditsShipUnlockReveal(result = {}) {
    if (!this.creditsPanel) return;
    const revealShip = getCreditsRevealShip(result.shipId);
    if (this.creditsRevealTicker) {
      this.game.app.ticker.remove(this.creditsRevealTicker);
      this.creditsRevealTicker = null;
    }
    if (this.creditsUnlockReveal?.parent) {
      this.creditsUnlockReveal.parent.removeChild(this.creditsUnlockReveal);
    }
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const compact = width < 820 || height < 760;
    const reveal = new PIXI.Container();
    reveal.label = 'ui_creditsShipUnlockReveal';
    reveal.zIndex = 1200;
    reveal.alpha = 0;
    reveal.scale.set(0.86);
    reveal.position.set(width / 2, height / 2);

    const maxW = Math.min(compact ? width * 0.9 : 760, width - 44);
    const maxH = Math.min(compact ? height * 0.62 : 420, height - 128);
    const bg = new PIXI.Graphics();
    bg.roundRect(-maxW / 2, -maxH / 2, maxW, maxH, 10);
    bg.fill({ color: 0x020711, alpha: 0.96 });
    bg.stroke({ color: 0xffef7e, width: 3, alpha: 0.98 });
    bg.roundRect(-maxW / 2 + 10, -maxH / 2 + 10, maxW - 20, maxH - 20, 8);
    bg.stroke({ color: 0xff55d9, width: 2, alpha: 0.7 });
    reveal.addChild(bg);

    const rays = new PIXI.Graphics();
    for (let i = 0; i < 18; i += 1) {
      const a = (Math.PI * 2 * i) / 18;
      const inner = Math.min(maxW, maxH) * 0.16;
      const outer = Math.max(maxW, maxH) * 0.56;
      rays.moveTo(Math.cos(a - 0.035) * inner, Math.sin(a - 0.035) * inner);
      rays.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      rays.lineTo(Math.cos(a + 0.035) * inner, Math.sin(a + 0.035) * inner);
    }
    rays.fill({ color: 0xffd15c, alpha: 0.11 });
    reveal.addChild(rays);
    this.creditsAnimatedNodes.push({ node: rays, kind: 'spin', speed: compact ? 0.32 : 0.24 });

    const title = createText(translateText('CONGRATULATIONS!'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 34 : 54,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#240018',
      strokeThickness: compact ? 5 : 7,
      align: 'center'
    });
    title.anchor.set(0.5);
    title.position.set(0, -maxH * 0.34);
    title.style.dropShadow = true;
    title.style.dropShadowColor = '#ff55d9';
    title.style.dropShadowBlur = 12;
    fitDisplayToBox(title, maxW - 40, compact ? 58 : 82, { minScale: 0.55 });
    reveal.addChild(title);

    const subtitleText = result.unlocked
      ? 'YOU UNLOCKED A NEW SHIP!'
      : 'SHIP ALREADY UNLOCKED!';
    const subtitle = createText(translateText(subtitleText), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 18 : 28,
      fontWeight: '900',
      fill: '#ffef7e',
      stroke: '#020711',
      strokeThickness: 4,
      align: 'center'
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(0, title.y + (compact ? 46 : 62));
    fitDisplayToBox(subtitle, maxW - 56, compact ? 34 : 44, { minScale: 0.62 });
    reveal.addChild(subtitle);

    const shipName = createText(revealShip.name, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 28 : 44,
      fontWeight: '900',
      fill: '#9cfbff',
      stroke: '#020711',
      strokeThickness: compact ? 4 : 6,
      align: 'center'
    });
    shipName.anchor.set(0.5);
    shipName.position.set(0, subtitle.y + (compact ? 38 : 52));
    fitDisplayToBox(shipName, maxW - 72, compact ? 42 : 58, { minScale: 0.58 });
    reveal.addChild(shipName);

    const shipRing = new PIXI.Graphics();
    shipRing.circle(0, maxH * 0.14, compact ? 54 : 72);
    shipRing.stroke({ color: 0x37f5ff, width: 3, alpha: 0.7 });
    shipRing.circle(0, maxH * 0.14, compact ? 72 : 96);
    shipRing.stroke({ color: 0xff55d9, width: 2, alpha: 0.42 });
    reveal.addChild(shipRing);
    this.creditsAnimatedNodes.push({ node: shipRing, kind: 'breathe', baseScale: 1, speed: 3.1 });

    const shipSrc = revealShip.asset;
    if (shipSrc) {
      PIXI.Assets.load(shipSrc)
        .then((texture) => {
          if (!texture || !this.creditsUnlockReveal || reveal.destroyed) return;
          const ship = new PIXI.Sprite(texture);
          ship.anchor.set(0.5);
          const target = compact ? 102 : 136;
          const scale = Math.min(target / Math.max(1, texture.width || target), target / Math.max(1, texture.height || target));
          ship.scale.set(scale);
          ship.position.set(0, maxH * 0.14);
          reveal.addChild(ship);
          this.creditsAnimatedNodes.push({ node: ship, kind: 'breathe', baseScale: scale, speed: 4.2 });
        })
        .catch((error) => console.warn('[SettingsOverlay] Unlock ship art failed:', error));
    }

    const cta = createText(translateText('HANGAR READY'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 16 : 22,
      fontWeight: '900',
      fill: '#020711',
      align: 'center'
    });
    cta.anchor.set(0.5);
    cta.position.set(0, maxH / 2 - (compact ? 34 : 42));
    const ctaBg = new PIXI.Graphics();
    const ctaW = Math.min(maxW - 72, Math.max(compact ? 190 : 260, cta.width + 72));
    ctaBg.roundRect(-ctaW / 2, cta.y - (compact ? 18 : 22), ctaW, compact ? 36 : 44, 8);
    ctaBg.fill({ color: 0xffef7e, alpha: 0.96 });
    ctaBg.stroke({ color: 0xffffff, width: 2, alpha: 0.75 });
    reveal.addChild(ctaBg, cta);

    this.creditsPanel.addChild(reveal);
    this.creditsUnlockReveal = reveal;
    this.creditsAnimatedNodes.push({ node: reveal, kind: 'unlockPop', baseScale: 1, speed: 5.6 });
    this.creditsDebugState = {
      ...(this.creditsDebugState || {}),
      unlockReveal: debugBounds(reveal),
      unlockRevealText: {
        title: title.text,
        subtitle: subtitle.text,
        ship: shipName.text
      }
    };

    AudioManager.playSfx('achievement', { force: true, volume: 1.0, minIntervalMs: 0 });
    AudioManager.playSfx('boss_reveal_stinger', { force: true, volume: 0.72, minIntervalMs: 0 });
    if (result.shipId === CREDITS_ASCENDANT_EASTER_EGG_SHIP_ID && result.unlocked) {
      AudioManager.playVoice('mission_control_eirik_viking_unlocked', {
        force: true,
        stopOtherVoices: true,
        exclusiveGroup: 'announcer',
        cooldownMs: 8000,
        eventCooldownMs: 0,
        duckMs: 4300,
        duckFactor: 0.26,
        volume: 1.04
      });
    }

    let elapsed = 0;
    const ticker = (delta) => {
      if (!this.creditsPanel || this.creditsUnlockReveal !== reveal || reveal.destroyed || !reveal.scale?.set) {
        this.game.app.ticker.remove(ticker);
        if (this.creditsRevealTicker === ticker) this.creditsRevealTicker = null;
        return;
      }
      elapsed += delta.deltaTime * 16.67;
      const inT = Math.min(1, elapsed / 240);
      reveal.alpha = inT;
      reveal.scale.set(0.86 + inT * 0.14);
      if (elapsed > 5200) {
        const outT = Math.min(1, (elapsed - 5200) / 500);
        reveal.alpha = 1 - outT;
        if (outT >= 1) {
          this.game.app.ticker.remove(ticker);
          if (reveal.parent) reveal.parent.removeChild(reveal);
          if (this.creditsUnlockReveal === reveal) this.creditsUnlockReveal = null;
          if (this.creditsRevealTicker === ticker) this.creditsRevealTicker = null;
        }
      }
    };
    this.creditsRevealTicker = ticker;
    this.game.app.ticker.add(ticker);
  }

  startCreditsAnimation() {
    if (this.creditsTicker) this.game.app.ticker.remove(this.creditsTicker);
    this.creditsTicker = () => {
      const now = performance.now() * 0.001;
      for (const entry of this.creditsAnimatedNodes) {
        if (!entry?.node || entry.node.destroyed) continue;
        if (entry.kind === 'pulse') {
          const pulse = Math.sin(now * entry.speed) * 0.5 + 0.5;
          entry.node.scale?.set?.((entry.baseScale || 1) + pulse * 0.035);
        } else if (entry.kind === 'drift') {
          entry.node.x = (entry.baseX || 0) + Math.sin(now * entry.speed) * 10;
          entry.node.y = (entry.baseY || 0) + Math.cos(now * entry.speed * 0.7) * 6;
        } else if (entry.kind === 'scanY') {
          const range = Math.max(1, entry.maxY || 1);
          entry.node.y = (entry.baseY || 0) + ((now * 60 * (entry.speed || 0.3)) % range);
        } else if (entry.kind === 'spin') {
          entry.node.rotation += (entry.speed || 0.2) * 0.016;
        } else if (entry.kind === 'breathe') {
          const pulse = Math.sin(now * entry.speed) * 0.5 + 0.5;
          entry.node.scale?.set?.((entry.baseScale || 1) * (1 + pulse * 0.045));
        } else if (entry.kind === 'unlockPop') {
          const pulse = Math.sin(now * entry.speed) * 0.5 + 0.5;
          entry.node.rotation = Math.sin(now * 2.3) * 0.006;
          if (entry.node.alpha > 0.9) entry.node.scale?.set?.((entry.baseScale || 1) + pulse * 0.012);
        }
      }
    };
    this.game.app.ticker.add(this.creditsTicker);
  }

  createCreditsSpectacle(rect, isCompact = false) {
    const art = new PIXI.Container();
    art.label = 'ui_creditsSpectacle';
    const { x, y, width, height } = rect;
    art.position.set(x, y);

    art.addChild(this.createCreditsImageLayer({ x: 0, y: 0, width, height, alpha: 0.95, focusX: 0.18 }));

    const frame = new PIXI.Graphics();
    frame.roundRect(0, 0, width, height, 8);
    frame.fill({ color: 0x020713, alpha: 0.08 });
    frame.stroke({ color: 0x37f5ff, width: 2, alpha: 0.88 });
    for (let i = 0; i < 10; i += 1) {
      const px = (i * 47) % Math.max(1, width);
      const py = (i * 29) % Math.max(1, height);
      frame.circle(px, py, isCompact ? 18 + (i % 3) * 8 : 26 + (i % 4) * 11);
      frame.fill({ color: i % 2 ? 0xff55d9 : 0x37f5ff, alpha: 0.035 + (i % 3) * 0.018 });
    }
    frame.rect(0, height * 0.72, width, height * 0.28);
    frame.fill({ color: 0x000000, alpha: 0.22 });
    art.addChild(frame);

    const sweep = new PIXI.Graphics();
    sweep.rect(8, 0, width - 16, Math.max(6, height * 0.035));
    sweep.fill({ color: 0x7fffd8, alpha: 0.16 });
    sweep.rect(8, Math.max(8, height * 0.035), width - 16, 2);
    sweep.fill({ color: 0xff55d9, alpha: 0.34 });
    art.addChild(sweep);
    this.creditsAnimatedNodes.push({ node: sweep, kind: 'scanY', baseY: 0, maxY: Math.max(12, height - 18), speed: isCompact ? 0.38 : 0.3 });

    const holoRing = new PIXI.Graphics();
    holoRing.position.set(width * 0.76, height * 0.2);
    holoRing.circle(0, 0, Math.min(width, height) * 0.13);
    holoRing.stroke({ color: 0xffef7e, width: 2, alpha: 0.44 });
    holoRing.circle(0, 0, Math.min(width, height) * 0.19);
    holoRing.stroke({ color: 0x37f5ff, width: 1, alpha: 0.26 });
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      holoRing.moveTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
      holoRing.lineTo(Math.cos(angle) * Math.min(width, height) * 0.2, Math.sin(angle) * Math.min(width, height) * 0.2);
    }
    holoRing.stroke({ color: 0xff55d9, width: 1, alpha: 0.16 });
    art.addChild(holoRing);
    this.creditsAnimatedNodes.push({ node: holoRing, kind: 'spin', speed: 0.18 });
    return art;

    const cabinet = new PIXI.Graphics();
    const cabinetX = width * (isCompact ? 0.17 : 0.2);
    const cabinetY = height * (isCompact ? 0.28 : 0.54);
    const cabinetW = width * (isCompact ? 0.18 : 0.28);
    const cabinetH = height * (isCompact ? 0.46 : 0.48);
    cabinet.roundRect(cabinetX, cabinetY, cabinetW, cabinetH, 7);
    cabinet.fill({ color: 0x10243b, alpha: 0.96 });
    cabinet.stroke({ color: 0xffd15c, width: 2, alpha: 0.92 });
    cabinet.rect(cabinetX + cabinetW * 0.17, cabinetY + cabinetH * 0.13, cabinetW * 0.66, cabinetH * 0.32);
    cabinet.fill({ color: 0x05111f, alpha: 1 });
    cabinet.stroke({ color: 0x7fffd8, width: 1, alpha: 0.82 });
    cabinet.circle(cabinetX + cabinetW * 0.31, cabinetY + cabinetH * 0.67, Math.max(4, cabinetW * 0.06));
    cabinet.fill({ color: 0xff55d9, alpha: 0.95 });
    cabinet.circle(cabinetX + cabinetW * 0.5, cabinetY + cabinetH * 0.67, Math.max(4, cabinetW * 0.06));
    cabinet.fill({ color: 0x37f5ff, alpha: 0.95 });
    cabinet.circle(cabinetX + cabinetW * 0.69, cabinetY + cabinetH * 0.67, Math.max(4, cabinetW * 0.06));
    cabinet.fill({ color: 0xffd15c, alpha: 0.95 });
    cabinet.alpha = 0.32;
    art.addChild(cabinet);

    const boss = new PIXI.Graphics();
    const bossX = width * (isCompact ? 0.63 : 0.64);
    const bossY = height * (isCompact ? 0.45 : 0.38);
    const bossR = Math.min(width, height) * (isCompact ? 0.13 : 0.18);
    boss.circle(bossX, bossY, bossR);
    boss.fill({ color: 0x270b3d, alpha: 0.96 });
    boss.stroke({ color: 0xff55d9, width: 3, alpha: 0.95 });
    boss.circle(bossX, bossY, bossR * 0.38);
    boss.fill({ color: 0xf6fbff, alpha: 0.95 });
    boss.circle(bossX, bossY, bossR * 0.18);
    boss.fill({ color: 0xff55d9, alpha: 1 });
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12;
      boss.moveTo(bossX + Math.cos(angle) * bossR * 1.06, bossY + Math.sin(angle) * bossR * 1.06);
      boss.lineTo(bossX + Math.cos(angle) * bossR * 1.42, bossY + Math.sin(angle) * bossR * 1.42);
    }
    boss.stroke({ color: 0x7fffd8, width: 2, alpha: 0.62 });
    boss.alpha = 0.38;
    art.addChild(boss);

    const ship = new PIXI.Graphics();
    ship.moveTo(width * 0.43, height * 0.78);
    ship.lineTo(width * 0.54, height * 0.65);
    ship.lineTo(width * 0.49, height * 0.9);
    ship.closePath();
    ship.fill({ color: 0xf6fbff, alpha: 0.98 });
    ship.stroke({ color: 0x37f5ff, width: 2, alpha: 0.9 });
    ship.moveTo(width * 0.43, height * 0.81);
    ship.lineTo(width * 0.23, height * 0.96);
    ship.moveTo(width * 0.49, height * 0.88);
    ship.lineTo(width * 0.34, height * 1.02);
    ship.stroke({ color: 0x37f5ff, width: isCompact ? 3 : 5, alpha: 0.42 });
    ship.alpha = 0.46;
    art.addChild(ship);

    const stampText = createText(isCompact ? 'GHOST\nAUDIT' : 'BOSS RECEIPTS\nMISFILED', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: isCompact ? 12 : 16,
      fontWeight: '900',
      fill: '#ffd15c',
      stroke: '#020711',
      strokeThickness: 3,
      align: 'center'
    });
    stampText.anchor.set(0.5);
    stampText.rotation = -0.15;
    stampText.position.set(width * 0.47, height * (isCompact ? 0.26 : 0.18));
    art.addChild(stampText);

    const lowerLabel = createText('TINYFOUNDRY GAMES', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: isCompact ? 10 : 14,
      fontWeight: '900',
      fill: '#7fffd8',
      stroke: '#020711',
      strokeThickness: 3,
      align: 'center'
    });
    lowerLabel.anchor.set(0.5);
    lowerLabel.position.set(width / 2, height - (isCompact ? 15 : 24));
    fitTextToWidth(lowerLabel, width - 34, { minScale: 0.7 });
    art.addChild(lowerLabel);
    return art;
  }

  createCreditsImageLayer({ x, y, width, height, alpha = 0.35, focusX = 0.5 }) {
    const layer = new PIXI.Container();
    layer.position.set(x, y);
    layer.alpha = alpha;

    const mask = new PIXI.Graphics();
    mask.roundRect(0, 0, width, height, 8);
    mask.fill({ color: 0xffffff, alpha: 1 });
    layer.addChild(mask);
    layer.mask = mask;

    const mountTexture = (texture) => {
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0);
      const textureWidth = texture?.width || width;
      const textureHeight = texture?.height || height;
      const scale = Math.max(width / textureWidth, height / textureHeight);
      sprite.scale.set(scale);
      sprite.position.set((width - textureWidth * scale) * focusX, (height - textureHeight * scale) * 0.5);
      layer.addChildAt(sprite, 0);
    };

    PIXI.Assets.load(AssetManifest.generated.menuCredits)
      .then(mountTexture)
      .catch((error) => {
        console.warn('[SettingsOverlay] Credits art failed to load:', error);
      });

    return layer;
  }

  closeCreditsPanel() {
    if (!this.creditsPanel) return;
    if (this.creditsTicker) {
      this.game.app.ticker.remove(this.creditsTicker);
      this.creditsTicker = null;
    }
    if (this.creditsRevealTicker) {
      this.game.app.ticker.remove(this.creditsRevealTicker);
      this.creditsRevealTicker = null;
    }
    this.creditsAnimatedNodes = [];
    if (this.creditsPanel.parent) {
      this.creditsPanel.parent.removeChild(this.creditsPanel);
    }
    this.creditsPanel.destroy({ children: true });
    this.creditsPanel = null;
    this.creditsBackButton = null;
    this.creditsCoinButton = null;
    this.creditsControls = [];
    this.creditsFocusedIndex = 0;
    this.creditsDebugState = null;
    this.creditsCoinClicks = 0;
    this.creditsEggStatusText = null;
    this.creditsUnlockReveal = null;
  }

  getDebugState() {
    const displaySettings = getDisplaySettings();
    return {
      display: {
        mode: displaySettings.mode,
        windowSize: displaySettings.windowSize,
        uiScale: displaySettings.uiScale,
        uiScaleLabel: this.uiScaleButton?._label?.text || getUiScaleLabel(displaySettings.uiScale),
        confirmExit: getMenuSettings().confirmExit,
        confirmExitLabel: this.confirmExitButton?._label?.text || (getMenuSettings().confirmExit ? 'ON' : 'OFF'),
        modeLabel: this.displayModeButton?._label?.text || null,
        sizeLabel: this.displaySizeButton?._label?.text || null,
        status: this.displayStatusText?.text || null,
        options: {
          modes: this.getAvailableDisplayModes().map((entry) => entry.id),
          sizes: this.getWindowSizeOptions().map((entry) => ({
            width: entry.width,
            height: entry.height,
            label: entry.label || null
          }))
        }
      },
      musicPack: {
        value: AudioManager.getSettings().musicPack,
        button: debugBounds(this.musicPackButton),
        label: this.musicPackButton?._label?.text || null
      },
      footer: Object.fromEntries(Object.entries(this.footerButtons).map(([key, button]) => [key, debugBounds(button)])),
      credits: this.creditsDebugState,
      creditsFocus: this.creditsControls[this.creditsFocusedIndex]?.label || null,
      focus: this.getFocusedControl()?.id || null,
      menuFx: this.menuFx?.getDebugState?.() || null
    };
  }

  close() {
    this.closeCreditsPanel();
    destroyMenuFx(this);
    if (this.languageUnsubscribe) {
      this.languageUnsubscribe();
      this.languageUnsubscribe = null;
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
    this.onClose?.();
  }
}
