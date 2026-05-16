import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { getAccessibilitySettings, setScreenShakeScale } from '../config/AccessibilitySettings.js';
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
    this.rows = [];
    this.draggingSlider = null;
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

    const panelWidth = Math.min(560, width * 0.82);
    const panelHeight = Math.min(580, height * 0.9);
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const panel = new PIXI.Graphics();
    panel.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    panel.fill({ color: 0x06111f, alpha: 0.96 });
    panel.stroke({ color: 0x00ffff, width: 2, alpha: 0.95 });
    this.container.addChild(panel);

    const titleText = createText(this.title, {
      fontFamily: 'Courier New',
      fontSize: 34,
      fontWeight: 'bold',
      fill: '#f6fbff',
      stroke: '#003344',
      strokeThickness: 4
    });
    titleText.anchor.set(0.5);
    titleText.position.set(width / 2, panelY + 48);
    this.container.addChild(titleText);

    let y = panelY + 100;
    this.addToggleRow('MUSIC', settings.musicEnabled, y, (enabled) => AudioManager.setMusicEnabled(enabled));
    y += 54;
    this.addToggleRow('VOICE', settings.voiceEnabled, y, (enabled) => AudioManager.setVoiceEnabled(enabled));
    y += 62;
    this.addSliderRow('MASTER', 'master', settings.masterVolume, y);
    y += 52;
    this.addSliderRow('MUSIC VOL', 'music', settings.musicVolume, y);
    y += 52;
    this.addSliderRow('SFX VOL', 'sfx', settings.sfxVolume, y);
    y += 52;
    this.addSliderRow('VOICE VOL', 'voice', settings.voiceVolume, y);
    y += 52;
    this.addSliderRow('SHAKE', 'screenShake', accessibility.screenShake, y, {
      onChange: setScreenShakeScale
    });
    y += 64;

    this.container.addChild(this.createButton('FULLSCREEN', width / 2, y, () => this.toggleFullscreen()));
    this.container.addChild(this.createButton('CLOSE', width / 2, panelY + panelHeight - 42, () => this.close()));
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

  close() {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
    this.onClose?.();
  }
}
