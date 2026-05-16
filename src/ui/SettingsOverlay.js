import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { getAccessibilitySettings, setScreenShakeScale } from '../config/AccessibilitySettings.js';
import { BUILD_ID } from '../buildInfo.js';
import { createText } from '../utils/pixiText.js';

function percent(value) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
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
    this.creditsPanel = null;
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
    const panelHeight = Math.min(isCompact ? 700 : 630, height * (isCompact ? 0.96 : 0.92));
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const panel = new PIXI.Graphics();
    panel.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    panel.fill({ color: 0x06111f, alpha: 0.96 });
    panel.stroke({ color: 0x00ffff, width: 2, alpha: 0.95 });
    this.container.addChild(panel);

    const titleText = createText(this.title, {
      fontFamily: 'Courier New',
      fontSize: isCompact ? 28 : 34,
      fontWeight: 'bold',
      fill: '#f6fbff',
      stroke: '#003344',
      strokeThickness: 4
    });
    titleText.anchor.set(0.5);
    titleText.position.set(width / 2, panelY + (isCompact ? 42 : 48));
    this.container.addChild(titleText);

    const toggleGap = isCompact ? 44 : 54;
    const testGap = isCompact ? 42 : 50;
    const sliderGap = isCompact ? 44 : 52;
    const footerGap = isCompact ? 50 : 64;
    const footerButtonHeight = isCompact ? 32 : 38;
    const stackedButtonWidth = Math.min(240, panelWidth - 56);
    let y = panelY + (isCompact ? 84 : 100);
    this.addToggleRow('MUSIC', settings.musicEnabled, y, (enabled) => AudioManager.setMusicEnabled(enabled));
    y += toggleGap;
    this.addToggleRow('VOICE', settings.voiceEnabled, y, (enabled) => AudioManager.setVoiceEnabled(enabled));
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
    y += footerGap;
    const footerY = isCompact ? Math.min(y, panelY + panelHeight - 118) : y;

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
      fontFamily: 'Courier New',
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
      fontFamily: 'Courier New',
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

  addSliderRow(label, kind, initialValue, y, { onChange = null } = {}) {
    const width = this.game.getWidth();
    const row = new PIXI.Container();
    row.position.set(width / 2, y);

    const labelText = createText(label, {
      fontFamily: 'Courier New',
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
      fontFamily: 'Courier New',
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
      fontFamily: 'Courier New',
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
    const isCompact = width < 620 || height < 680;
    const panelWidth = Math.min(620, width * 0.84);
    const panelHeight = Math.min(isCompact ? 500 : 500, height * 0.86);
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const overlay = new PIXI.Container();
    overlay.zIndex = 1000;
    overlay.label = 'ui_creditsPanel';
    overlay.eventMode = 'static';
    overlay.hitArea = new PIXI.Rectangle(0, 0, width, height);

    const dim = new PIXI.Graphics();
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x00040b, alpha: 0.66 });
    dim.eventMode = 'static';
    overlay.addChild(dim);

    const panel = new PIXI.Graphics();
    panel.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    panel.fill({ color: 0x06111f, alpha: 0.98 });
    panel.stroke({ color: 0xff55d9, width: 2, alpha: 0.92 });
    overlay.addChild(panel);

    const title = createText('BURT SHOOTER CREDITS', {
      fontFamily: 'Courier New',
      fontSize: isCompact ? 22 : 30,
      fontWeight: 'bold',
      fill: '#f6fbff',
      stroke: '#3a0635',
      strokeThickness: 4,
      align: 'center'
    });
    title.anchor.set(0.5);
    title.position.set(width / 2, panelY + (isCompact ? 42 : 50));
    overlay.addChild(title);

    const body = createText([
      'Design: arctic arcade chaos over Stokmarknes.',
      'Runtime: PixiJS + Vite.',
      'Art: generated arctic backdrops, boss dossier, crew portraits.',
      'Audio: contextual music pools, mission-control voice pack, catalog-gated SFX.',
      'Controls: keyboard, touch, gamepad.',
      `Build: ${BUILD_ID}`
    ].join('\n'), {
      fontFamily: 'Courier New',
      fontSize: isCompact ? 13 : 16,
      fill: '#c9f6ff',
      lineHeight: isCompact ? 21 : 27,
      wordWrap: true,
      wordWrapWidth: panelWidth - 72,
      align: 'left'
    });
    body.anchor.set(0.5, 0);
    body.position.set(width / 2, panelY + (isCompact ? 82 : 102));
    overlay.addChild(body);

    const buttonY = panelY + panelHeight - (isCompact ? 34 : 38);
    const footerBottom = buttonY - (isCompact ? 50 : 56);
    const footer = createText('Asset provenance is tracked in docs/visual-asset-pipeline.md.', {
      fontFamily: 'Courier New',
      fontSize: isCompact ? 11 : 13,
      fill: '#ffb9ef',
      wordWrap: true,
      wordWrapWidth: panelWidth - 72,
      align: 'center'
    });
    footer.anchor.set(0.5, 1);
    footer.position.set(width / 2, footerBottom);
    overlay.addChild(footer);

    overlay.addChild(this.createButton('BACK', width / 2, buttonY, () => this.closeCreditsPanel(), { width: 220 }));
    this.creditsPanel = overlay;
    this.container.addChild(overlay);
    AudioManager.playSfx('ui_open', { volume: 0.16, minIntervalMs: 120 });
  }

  closeCreditsPanel() {
    if (!this.creditsPanel) return;
    if (this.creditsPanel.parent) {
      this.creditsPanel.parent.removeChild(this.creditsPanel);
    }
    this.creditsPanel.destroy({ children: true });
    this.creditsPanel = null;
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
