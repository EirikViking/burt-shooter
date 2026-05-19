import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import {
  getAccessibilitySettings,
  setColorAssistEnabled,
  setPlayerFocusScale,
  setScreenShakeScale
} from '../config/AccessibilitySettings.js';
import { BUILD_ID } from '../buildInfo.js';
import { createText } from '../utils/pixiText.js';
import { AssetManifest } from '../assets/assetManifest.js';

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
    this.rows = [];
    this.draggingSlider = null;
    this.audioTestButtons = {};
    this.musicPackButton = null;
    this.creditsPanel = null;
    this.creditsDebugState = null;
    this.build();
  }

  build() {
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const settings = AudioManager.getSettings();
    const accessibility = getAccessibilitySettings();
    this.container.eventMode = 'static';
    this.container.hitArea = new PIXI.Rectangle(0, 0, width, height);

    const dim = new PIXI.Graphics();
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x020713, alpha: 0.82 });
    dim.eventMode = 'static';
    this.container.addChild(dim);

    const isCompact = width < 620 || height < 720;
    const panelWidth = Math.min(560, width * 0.82);
    const panelHeight = Math.min(isCompact ? 740 : 690, height * (isCompact ? 0.97 : 0.94));
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const panel = new PIXI.Graphics();
    panel.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    panel.fill({ color: 0x06111f, alpha: 0.96 });
    panel.stroke({ color: 0x00ffff, width: 2, alpha: 0.95 });
    this.container.addChild(panel);

    const titleText = createText(this.title, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: isCompact ? 28 : 34,
      fontWeight: 'bold',
      fill: '#f6fbff',
      stroke: '#003344',
      strokeThickness: 4
    });
    titleText.anchor.set(0.5);
    titleText.position.set(width / 2, panelY + (isCompact ? 42 : 48));
    this.container.addChild(titleText);

    const toggleGap = isCompact ? 40 : 46;
    const testGap = isCompact ? 38 : 44;
    const sliderGap = isCompact ? 40 : 46;
    const footerGap = isCompact ? 44 : 52;
    const footerButtonHeight = isCompact ? 32 : 38;
    const stackedButtonWidth = Math.min(240, panelWidth - 56);
    let y = panelY + (isCompact ? 84 : 100);
    this.addToggleRow('MUSIC', settings.musicEnabled, y, (enabled) => AudioManager.setMusicEnabled(enabled));
    y += toggleGap;
    this.addToggleRow('VOICE', settings.voiceEnabled, y, (enabled) => AudioManager.setVoiceEnabled(enabled));
    y += testGap;
    this.addMusicPackRow('MUSIC SET', settings.musicPack, y);
    y += testGap;
    this.addAudioTestRow('TEST', y);
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
    y += footerGap;
    const footerY = isCompact ? Math.min(y, panelY + panelHeight - 128) : y;

    if (panelWidth >= 500) {
      this.container.addChild(this.createButton('CREDITS', width / 2 - 126, footerY, () => this.openCreditsPanel(), { width: 220, height: footerButtonHeight }));
      this.container.addChild(this.createButton('FULLSCREEN', width / 2 + 126, footerY, () => this.toggleFullscreen(), { width: 220, height: footerButtonHeight }));
    } else {
      this.container.addChild(this.createButton('CREDITS', width / 2, footerY, () => this.openCreditsPanel(), { width: stackedButtonWidth, height: footerButtonHeight }));
      this.container.addChild(this.createButton('FULLSCREEN', width / 2, footerY + 38, () => this.toggleFullscreen(), { width: stackedButtonWidth, height: footerButtonHeight }));
    }
    this.container.addChild(this.createButton('CLOSE', width / 2, panelY + panelHeight - (isCompact ? 28 : 42), () => this.close(), {
      width: isCompact ? stackedButtonWidth : 240,
      height: footerButtonHeight
    }));
  }

  addToggleRow(label, initialValue, y, onChange) {
    const width = this.game.getWidth();
    const row = new PIXI.Container();
    row.position.set(width / 2, y);

    const labelText = createText(label, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 18,
      fill: '#9befff'
    });
    labelText.anchor.set(1, 0.5);
    labelText.x = -82;
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
    row.addChild(button);

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

    let pack = initialPack === 'classic' ? 'classic' : 'generated';
    const button = this.createButton(pack === 'classic' ? 'CLASSIC' : 'NOVA', 18, 0, () => {
      pack = pack === 'classic' ? 'generated' : 'classic';
      const settings = AudioManager.setMusicPack(pack);
      pack = settings.musicPack === 'classic' ? 'classic' : 'generated';
      button._label.text = pack === 'classic' ? 'CLASSIC' : 'NOVA';
      fitTextToWidth(button._label, 132);
      AudioManager.playSfx('ui_open', { volume: 0.18, minIntervalMs: 80 });
    }, { width: 170, height: 32 });
    button.label = 'ui_settingsMusicPack';
    this.musicPackButton = button;
    fitTextToWidth(button._label, 132);
    row.addChild(button);

    const hint = createText(pack === 'classic' ? 'ALT TRACKS' : 'NEW ELEVENLABS', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 12,
      fill: '#ffc96e'
    });
    hint.anchor.set(0, 0.5);
    hint.x = 116;
    row.addChild(hint);

    button.on('pointertap', () => {
      hint.text = pack === 'classic' ? 'ALT TRACKS' : 'NEW ELEVENLABS';
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
    const valueText = createText(percent(initialValue), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 15,
      fill: '#ffffff'
    });
    valueText.anchor.set(0, 0.5);
    valueText.x = 160;
    row.addChild(track, knob, valueText);

    const draw = (value) => {
      const clamped = Math.max(0, Math.min(1, value));
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

    const setFromGlobal = (globalX) => {
      const local = row.toLocal({ x: globalX, y });
      const value = (local.x + trackWidth / 2) / trackWidth;
      const nextValue = onChange
        ? onChange(value)
        : AudioManager.setVolume(kind, value)[`${kind}Volume`];
      draw(Number.isFinite(nextValue) ? nextValue : value);
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
  }

  createButton(label, x, y, onPress, { width = 240, height = 38 } = {}) {
    const button = new PIXI.Container();
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.position.set(x, y);
    button.hitArea = new PIXI.Rectangle(-width / 2, -height / 2, width, height);

    const bg = new PIXI.Graphics();
    button.addChild(bg);

    const text = createText(label, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 17,
      fontWeight: 'bold',
      fill: '#ffffff'
    });
    text.anchor.set(0.5);
    button.addChild(text);
    button._label = text;

    const draw = (hovered = false) => {
      bg.clear();
      bg.roundRect(-width / 2, -height / 2, width, height, 6);
      bg.fill({ color: hovered ? 0x0b6f8f : 0x07334e, alpha: hovered ? 0.95 : 0.84 });
      bg.stroke({ color: hovered ? 0xffffff : 0x00ffff, width: hovered ? 2 : 1, alpha: 0.95 });
    };
    draw(false);

    button.on('pointerover', () => draw(true));
    button.on('pointerout', () => draw(false));
    button.on('pointertap', onPress);
    return button;
  }

  toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      } else {
        document.documentElement.requestFullscreen?.();
      }
      AudioManager.playSfx('ui_open', { volume: 0.2, minIntervalMs: 120 });
    } catch (error) {
      console.warn('[SettingsOverlay] Fullscreen toggle failed:', error);
    }
  }

  openCreditsPanel() {
    this.closeCreditsPanel();

    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const isCompact = width < 820 || height < 760;
    const panelWidth = Math.min(isCompact ? width * 0.92 : 1120, width * 0.88);
    const panelHeight = Math.min(isCompact ? height * 0.9 : 720, height * 0.88);
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;
    const margin = isCompact ? 22 : 42;
    const headerHeight = isCompact ? 132 : 104;
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

    const dim = new PIXI.Graphics();
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x00040b, alpha: 0.94 });
    dim.eventMode = 'static';
    overlay.addChild(dim);

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

    const title = createText('CREDITS: THE CABINET DENIES EVERYTHING', {
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

    const subtitle = createText('A Tinyfoundry Games incident report, lightly redacted by mission control.', {
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
      ? { x: panelX + margin, y: contentTop, width: panelWidth - margin * 2, height: Math.min(150, contentHeight * 0.34) }
      : { x: panelX + margin, y: contentTop, width: Math.min(380, panelWidth * 0.36), height: contentHeight };
    const art = this.createCreditsSpectacle(artRect, isCompact);
    overlay.addChild(art);

    const bodyX = isCompact ? panelX + margin : artRect.x + artRect.width + 36;
    const bodyY = isCompact ? artRect.y + artRect.height + 18 : contentTop + 2;
    const bodyWidth = isCompact ? panelWidth - margin * 2 : panelX + panelWidth - margin - bodyX;
    const bodyHeight = isCompact ? Math.max(170, contentBottom - bodyY - 14) : contentHeight - 4;
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
      'Tinyfoundry Games: proudly blamed for every tasteful explosion.',
      'Cabinet Ghost: promoted after eating seven coins and one meeting agenda.',
      'The Swarm: choreography by angry triangles with suspiciously good dental.',
      'Boss Scheduler: fifty bosses, zero breaks, one tractor-beam learning moment.',
      'Mission Control: sarcasm, volume ducking, snack authority.',
      'Popcorn Formation Union: filed fourteen complaints. All were dodged.',
      'You: pilot, auditor, apocalypse consultant, and the only adult in the room.',
      `Build: ${BUILD_ID}`
    ].join('\n');
    const body = createText(creditsCopy, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: isCompact ? 11 : 16,
      fill: '#c9f6ff',
      lineHeight: isCompact ? 15 : 22,
      fontWeight: '700',
      wordWrap: true,
      wordWrapWidth: bodyWidth,
      align: 'left'
    });
    body.anchor.set(0, 0);
    body.position.set(bodyX, bodyY);
    fitDisplayToBox(body, bodyWidth, bodyHeight, { minScale: isCompact ? 0.78 : 0.86 });
    overlay.addChild(body);

    const footer = createText('No cabinets were harmed. One cabinet was promoted to lore compliance.', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: isCompact ? 11 : 14,
      fontWeight: '800',
      fill: '#ffb9ef',
      wordWrap: true,
      wordWrapWidth: isCompact ? panelWidth - margin * 2 : bodyWidth,
      align: 'center'
    });
    footer.anchor.set(0.5, 1);
    footer.position.set(isCompact ? width / 2 : bodyX + bodyWidth / 2, buttonY - (isCompact ? 38 : 52));
    fitTextToWidth(footer, isCompact ? panelWidth - margin * 2 : bodyWidth, { minScale: 0.78 });
    overlay.addChild(footer);

    const backButton = this.createButton('BACK TO CABINET', width / 2, buttonY, () => this.closeCreditsPanel(), {
      width: isCompact ? Math.min(260, panelWidth - margin * 2) : 280,
      height: isCompact ? 34 : 38
    });
    overlay.addChild(backButton);
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
      backButton: debugBounds(backButton)
    };
    this.container.addChild(overlay);
    AudioManager.playSfx('ui_open', { volume: 0.16, minIntervalMs: 120 });
    AudioManager.playVoice?.('mission_control_credits', {
      force: true,
      volume: 0.9,
      duckFactor: 0.34,
      duckMs: 3600,
      cooldownMs: 0
    });
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
    if (this.creditsPanel.parent) {
      this.creditsPanel.parent.removeChild(this.creditsPanel);
    }
    this.creditsPanel.destroy({ children: true });
    this.creditsPanel = null;
    this.creditsDebugState = null;
  }

  getDebugState() {
    return {
      musicPack: {
        value: AudioManager.getSettings().musicPack,
        button: debugBounds(this.musicPackButton),
        label: this.musicPackButton?._label?.text || null
      },
      credits: this.creditsDebugState
    };
  }

  close() {
    this.closeCreditsPanel();
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
    this.onClose?.();
  }
}
