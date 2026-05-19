import * as PIXI from 'pixi.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { AudioManager } from '../audio/AudioManager.js';
import { createText } from '../utils/pixiText.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';

const INTRO_SEEN_KEY = 'nova_swarm_intro_seen_v1';

const PANELS = [
  {
    image: AssetManifest.generated.introPanels[0],
    eyebrow: 'NOVA STATION // CABINET ONLINE',
    title: 'ONE COIN LEFT',
    caption: 'Nova Station was built around an impossible arcade cabinet: one coin, one pilot, one clean lane through the dark.',
    voice: 'intro_narrator_01',
    sfx: 'coin_portal_open',
    durationMs: 7800
  },
  {
    image: AssetManifest.generated.introPanels[1],
    eyebrow: 'ENEMY CONTACT // PATTERN INTELLIGENCE',
    title: 'THE SWARM LEARNED YOU',
    caption: 'Then the swarm arrived. Not random. Not dumb. It learned your dodges, shaped itself into patterns, and guarded every sector with a boss.',
    voice: 'intro_narrator_02',
    sfx: 'swarm_chatter_stinger',
    durationMs: 8200
  },
  {
    image: AssetManifest.generated.introPanels[2],
    eyebrow: 'PILOT LINK // MANUAL OVERRIDE',
    title: 'SMALL SHIP. FAST HANDS.',
    caption: 'Your ship is not the biggest thing out here. Good. Big things blink late. You thread the lanes, steal the openings, and turn danger into score.',
    voice: 'intro_narrator_03',
    sfx: 'intro_panel_whoosh',
    durationMs: 8400
  },
  {
    image: AssetManifest.generated.introPanels[3],
    eyebrow: 'BOSS CHORUS // SCOREBOARD ARMED',
    title: 'PUT YOUR NAME IN LIGHTS',
    caption: 'The cabinet wants proof. Break the formations, hijack their tricks, crack the boss gates, and put your name where the swarm can see it.',
    voice: 'intro_narrator_04',
    sfx: 'boss_reveal_stinger',
    durationMs: 8200
  }
];

function fitCover(sprite, width, height) {
  if (!sprite?.texture || !width || !height) return;
  const texWidth = sprite.texture.width || width;
  const texHeight = sprite.texture.height || height;
  const scale = Math.max(width / texWidth, height / texHeight);
  sprite.scale.set(scale);
  sprite.x = width / 2;
  sprite.y = height / 2;
}

export class IntroScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;
    this.panelIndex = 0;
    this.panelElapsedMs = 0;
    this.started = false;
    this.destroyed = false;
    this.panelTextures = new Map();
    this.unsubLayout = null;
    this.keyHandler = null;
    this.pointerHandler = null;
    this.textGroup = null;
  }

  static shouldShow() {
    if (typeof window === 'undefined') return true;
    const params = new URLSearchParams(window.location.search);
    if (params.get('skipIntro') === '1' || params.get('autostart') === '1') return false;
    try {
      return localStorage.getItem(INTRO_SEEN_KEY) !== '1';
    } catch {
      return true;
    }
  }

  init() {
    this.destroyed = false;
    this.started = false;
    this.panelIndex = 0;
    this.panelElapsedMs = 0;
    this.container.removeChildren();

    this.backdrop = new PIXI.Sprite(PIXI.Texture.EMPTY);
    this.backdrop.anchor.set(0.5);
    this.backdrop.zIndex = 0;
    this.container.addChild(this.backdrop);

    this.shade = new PIXI.Graphics();
    this.shade.zIndex = 1;
    this.container.addChild(this.shade);

    this.scanlines = new PIXI.Graphics();
    this.scanlines.zIndex = 2;
    this.container.addChild(this.scanlines);

    this.textGroup = new PIXI.Container();
    this.textGroup.zIndex = 5;
    this.container.addChild(this.textGroup);

    this.eyebrow = createText('', {
      fontFamily: 'Rajdhani, Bahnschrift, sans-serif',
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#7ee9ff',
      letterSpacing: 0
    });
    this.eyebrow.anchor.set(0, 0.5);
    this.textGroup.addChild(this.eyebrow);

    this.title = createText('', {
      fontFamily: 'Orbitron, Rajdhani, sans-serif',
      fontSize: 42,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#03101d',
      strokeThickness: 5,
      letterSpacing: 0,
      padding: 18,
      dropShadow: true,
      dropShadowColor: '#00ffff',
      dropShadowBlur: 12,
      wordWrap: true
    });
    this.title.anchor.set(0, 0.5);
    this.textGroup.addChild(this.title);

    this.caption = createText('', {
      fontFamily: 'Rajdhani, Bahnschrift, sans-serif',
      fontSize: 18,
      fontWeight: '600',
      fill: '#dff9ff',
      stroke: '#02111d',
      strokeThickness: 4,
      wordWrap: true,
      lineHeight: 26
    });
    this.caption.anchor.set(0, 0);
    this.textGroup.addChild(this.caption);

    this.prompt = createText('CLICK / PRESS SPACE TO BEGIN  |  ESC SKIPS', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#ffd66b',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    });
    this.prompt.anchor.set(0.5);
    this.prompt.zIndex = 6;
    this.container.addChild(this.prompt);

    this.skipButton = this.createTextButton('SKIP');
    this.skipButton.zIndex = 8;
    this.skipButton.on('pointerdown', (event) => {
      event.stopPropagation?.();
      this.finish();
    });
    this.container.addChild(this.skipButton);

    this.nextButton = this.createTextButton('NEXT');
    this.nextButton.zIndex = 8;
    this.nextButton.on('pointerdown', (event) => {
      event.stopPropagation?.();
      this.advancePanel();
    });
    this.container.addChild(this.nextButton);

    this.pointerHandler = () => this.handlePrimaryAction();
    this.keyHandler = (event) => {
      if (event.key === 'Escape') {
        this.finish();
      } else if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowRight') {
        this.handlePrimaryAction();
      }
    };
    this.container.eventMode = 'static';
    this.container.hitArea = new PIXI.Rectangle(0, 0, this.game.getWidth(), this.game.getHeight());
    this.container.on('pointerdown', this.pointerHandler);
    window.addEventListener('keydown', this.keyHandler);

    this.unsubLayout = addResponsiveListener(() => this.layout());
    this.layout();
    this.loadPanelTextures();
  }

  async loadPanelTextures() {
    try {
      const textures = await PIXI.Assets.load(PANELS.map(panel => panel.image));
      PANELS.forEach((panel, index) => {
        const texture = Array.isArray(textures) ? textures[index] : textures?.[panel.image];
        if (texture) this.panelTextures.set(panel.image, texture);
      });
      if (this.destroyed) return;
      this.showPanel(0, { playAudio: false });
    } catch (error) {
      console.warn('[IntroScene] Failed to load intro art', error);
      if (!this.destroyed) this.showPanel(0, { playAudio: false });
    }
  }

  createTextButton(label) {
    const button = new PIXI.Container();
    button.eventMode = 'static';
    button.cursor = 'pointer';
    const bg = new PIXI.Graphics();
    bg.roundRect(-54, -19, 108, 38, 6);
    bg.fill({ color: 0x03101d, alpha: 0.72 });
    bg.stroke({ color: 0x00ffff, width: 1.5, alpha: 0.86 });
    button.addChild(bg);
    const text = createText(label, {
      fontFamily: 'Orbitron, Rajdhani, sans-serif',
      fontSize: 15,
      fontWeight: 'bold',
      fill: '#dff9ff'
    });
    text.anchor.set(0.5);
    button.addChild(text);
    return button;
  }

  handlePrimaryAction() {
    if (!this.started) {
      this.beginNarration();
      return;
    }
    this.advancePanel();
  }

  beginNarration() {
    if (this.started) return;
    this.started = true;
    this.panelElapsedMs = 0;
    this.prompt.text = 'SPACE / CLICK NEXT  |  ESC SKIPS';
    AudioManager.init();
    AudioManager.unlockAudio?.();
    AudioManager.stopAllVoices?.('intro_start');
    AudioManager.playMusicContext('intro', { resetPlaylist: true });
    this.showPanel(this.panelIndex, { playAudio: true });
  }

  showPanel(index, { playAudio = true } = {}) {
    const panel = PANELS[index];
    if (!panel) return;
    this.panelIndex = index;
    this.panelElapsedMs = 0;
    const texture = this.panelTextures.get(panel.image);
    if (texture) this.backdrop.texture = texture;
    this.eyebrow.text = panel.eyebrow;
    this.title.text = panel.title;
    this.caption.text = panel.caption;
    this.nextButton.visible = index < PANELS.length - 1;

    if (playAudio) {
      AudioManager.stopAllVoices?.('intro_panel_change');
      AudioManager.playSfx(panel.sfx, { force: true });
      AudioManager.playVoice(panel.voice, {
        force: true,
        exclusiveGroup: 'intro_narrator',
        stopOtherVoices: true,
        cooldownMs: 0,
        volume: 0.94,
        duckFactor: 0.35,
        duckMs: panel.durationMs
      });
    }
    this.layout();
  }

  advancePanel() {
    if (!this.started) {
      this.beginNarration();
      return;
    }
    if (this.panelIndex >= PANELS.length - 1) {
      this.finish();
      return;
    }
    this.showPanel(this.panelIndex + 1, { playAudio: true });
  }

  finish() {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch { }
    AudioManager.stopAllVoices?.('intro_finish');
    AudioManager.playSfx('start_game_confirm', { force: true });
    AudioManager.playMusicContext('menu');
    this.game.showMenu();
  }

  layout() {
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const layout = getCurrentLayout();
    this.container.hitArea = new PIXI.Rectangle(0, 0, width, height);
    fitCover(this.backdrop, width, height);

    this.shade.clear();
    this.shade.rect(0, 0, width, height);
    this.shade.fill({ color: 0x000000, alpha: 0.26 });
    this.shade.rect(0, Math.max(0, height * 0.55), width, height * 0.45);
    this.shade.fill({ color: 0x020711, alpha: 0.58 });

    this.scanlines.clear();
    for (let y = 0; y < height; y += 6) {
      this.scanlines.rect(0, y, width, 1);
    }
    this.scanlines.fill({ color: 0x00ffff, alpha: 0.025 });

    const margin = layout.isMobile ? 22 : Math.max(48, width * 0.07);
    const textWidth = layout.isMobile ? width - margin * 2 : Math.min(720, width * 0.58);
    const baseY = layout.isMobile ? height * 0.58 : height * 0.62;
    const titleSize = layout.isMobile ? 28 : 42;
    const captionSize = layout.isMobile ? 15 : 18;

    this.textGroup.x = margin;
    this.textGroup.y = baseY;
    this.eyebrow.style.fontSize = layout.isMobile ? 11 : 14;
    this.title.style.fontSize = titleSize;
    this.title.style.wordWrapWidth = textWidth;
    this.caption.style.fontSize = captionSize;
    this.caption.style.lineHeight = Math.round(captionSize * 1.42);
    this.caption.style.wordWrapWidth = textWidth;
    this.eyebrow.y = 0;
    this.title.y = layout.isMobile ? 32 : 42;
    this.caption.y = layout.isMobile ? 62 : 82;

    this.prompt.x = width / 2;
    this.prompt.y = height - (layout.isMobile ? 24 : 34);
    this.prompt.style.fontSize = layout.isMobile ? 11 : 14;

    this.skipButton.x = width - (layout.isMobile ? 70 : 82);
    this.skipButton.y = layout.isMobile ? 32 : 42;
    this.nextButton.x = width - (layout.isMobile ? 70 : 82);
    this.nextButton.y = height - (layout.isMobile ? 74 : 88);
  }

  update(delta = 1) {
    if (!this.started) {
      this.prompt.alpha = 0.74 + Math.sin(Date.now() * 0.006) * 0.18;
      return;
    }
    this.panelElapsedMs += delta * 16.67;
    const panel = PANELS[this.panelIndex];
    if (panel && this.panelElapsedMs >= panel.durationMs) {
      this.advancePanel();
    }
    const pulse = 1 + Math.sin(Date.now() * 0.004) * 0.01;
    this.textGroup.scale.set(pulse);
  }

  destroy() {
    this.destroyed = true;
    if (this.unsubLayout) {
      this.unsubLayout();
      this.unsubLayout = null;
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    if (this.pointerHandler) {
      this.container.off('pointerdown', this.pointerHandler);
      this.pointerHandler = null;
    }
    AudioManager.stopAllVoices?.('intro_destroy');
    this.container.removeChildren();
  }
}

