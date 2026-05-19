import { AssetManifest } from '../assets/assetManifest.js';
import * as Features from '../config/Features.js';
import { SFX_CATALOG, SFX_MIX, VOICE_MIX, VOICE_EVENT_FALLBACKS, getMusicPlaylists, normalizeMusicPack } from './SoundCatalog.js';
import { BUILD_ID } from '../buildInfo.js';

class AudioController {
  constructor() {
    this.context = null;
    this.enabled = false;
    this.musicEnabled = false;
    this.voiceEnabled = false;
    this.musicPack = 'classic';

    // Volume
    this.masterVolume = 0.3;
    this.musicVolume = 0.2;
    this.sfxVolume = 0.4;
    this.voiceVolume = 0.45;
    this.musicDuckFactor = 1;
    this.pauseDuckFactor = 1;

    // Music State
    this.currentContext = null;
    this.playlist = [];
    this.currentTrackSrc = null;

    // Single Audio Instance
    this.musicAudio = new Audio();
    this.musicAudio.loop = false;

    // Bind once to avoid stacking listeners
    this.musicAudio.addEventListener('ended', () => this.onTrackEnded());
    this.musicAudio.addEventListener('error', (e) => this.onTrackError(e));

    // Per-context history
    this.lastTrackByContext = {
      intro: null,
      menu: null,
      scoreboard: null,
      gameplay: null,
      boss: null,
      gameover: null,
      victory: null
    };

    // Error recovery
    this.retryCount = 0;
    this.maxRetries = 3;

    // SFX State
    this.globalVoiceCooldown = 0;
    this.sfxCooldowns = {};
    this.sfxPools = {};
    this.sfxPoolIndex = {};
    this.lastSfxPlayedAt = {};
    this.lastPowerupVoiceIndex = -1;
    this.lastVoicePlayedAt = {};
    this.voiceVariantBags = {};
    this.lastVoiceVariantByEvent = {};
    this.activeVoiceGroups = {};
    this.activeVoices = new Map();
    this.voicePlayId = 0;
    this.lastSfxEvent = null;
    this.lastSfxTrack = null;
    this.lastVoiceEvent = null;
    this.lastVoiceTrack = null;
    this.sfxAssetHealth = new Map();
    this.pooledSfxKeys = new Set([
      'shoot_small',
      'hit',
      'impactMetal',
      'enemy_explode',
      'explosion',
      'explosionCrunch',
      'boss_explode',
      'enemy_shoot',
      'powerup',
      'pickup',
      'achievement',
      'forceField'
    ]);

    // Safety lock
    this.isSwitchingTrack = false;
    this.pendingTrackRequest = null;
    this.pendingTrackTimer = null;
    this.switchStartedAt = 0;
    this.trackSwitchToken = 0;

    // Idempotency guard
    this._initialized = false;
    this._debugKeyHandler = null;
    this.duckTimer = null;

    // SFX denylist (bad/annoying variants)
    this.sfxDenylist = new Set(['shoot_alt']);
    this.sfxDenylistLogged = {};

    this.loadPreferences();
  }

  readStoredFloat(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === '') return fallback;
      const value = Number(raw);
      return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
    } catch {
      return fallback;
    }
  }

  readMixNumber(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  clampUnit(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  loadPreferences() {
    if (typeof localStorage === 'undefined') return;

    this.masterVolume = this.readStoredFloat('burt_volume_master', this.masterVolume);
    this.musicVolume = this.readStoredFloat('burt_volume_music', this.musicVolume);
    this.sfxVolume = this.readStoredFloat('burt_volume_sfx', this.sfxVolume);
    this.voiceVolume = this.readStoredFloat('burt_volume_voice', this.voiceVolume);
    this.musicPack = normalizeMusicPack(localStorage.getItem('burt_music_pack') || this.musicPack);

    const savedMusic = localStorage.getItem('burt_music_enabled');
    if (savedMusic !== null) this.musicEnabled = savedMusic !== 'false' && Features.MUSIC_ENABLED;

    const savedVoice = localStorage.getItem('burt_voice_enabled');
    if (savedVoice !== null) this.voiceEnabled = savedVoice !== 'false' && Features.VOICE_ENABLED;

    this.applyMusicVolume();
  }

  init() {
    console.log('[AudioManager] INIT called. Feature Enabled:', Features.AUDIO_ENABLED);

    // Idempotency guard: only initialize once
    if (this._initialized) {
      console.log('[AudioManager] Already initialized. Skipping duplicate init.');
      return;
    }

    if (!Features.AUDIO_ENABLED) {
      console.log('[AudioManager] Audio disabled by feature flag.');
      return;
    }

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContext();
      this.enabled = true;
      this.loadPreferences();

      const savedMusic = localStorage.getItem('burt_music_enabled');
      this.musicEnabled = savedMusic !== 'false' && Features.MUSIC_ENABLED;
      const savedVoice = localStorage.getItem('burt_voice_enabled');
      this.voiceEnabled = savedVoice !== 'false' && Features.VOICE_ENABLED;

      // Add debug key listener globally (only once)
      if (!this._debugKeyHandler) {
        this._debugKeyHandler = (e) => {
          if (e.key === 'n' || e.key === 'N') {
            this.debugNextTrack();
          }
        };
        window.addEventListener('keydown', this._debugKeyHandler);
      }

      this._initialized = true;
      console.log('[AudioManager] INIT OK. Context:', this.context.state);
      this.context.onstatechange = () => {
        if (this.context.state === 'running') {
          this.recoverSfx('context_resumed');
        }
      };
    } catch (e) {
      console.warn('[AudioManager] Failed to init context:', e);
      this.enabled = false;
    }
  }

  async unlockAudio() {
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
    // Mobile Safari often needs this on the Audio element too
    this.musicAudio.play().catch(() => { });
    this.musicAudio.pause();
  }

  addUnlockListener(pendingSrc) {
    if (this.unlockListenerBound) return;
    this.unlockListenerBound = true;

    const unlock = () => {
      console.log('[Audio] User gesture detected. Resuming audio context...');
      this.unlockAudio().then(() => {
        const currentPlaylist = getMusicPlaylists(this.musicPack)[this.currentContext] || [];
        if (pendingSrc && currentPlaylist.includes(pendingSrc)) {
          this.startTrack(pendingSrc);
        } else if (this.currentContext) {
          this.playMusicContext(this.currentContext, { force: true });
        }
      });
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      this.unlockListenerBound = false;
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  debugNextTrack() {
    if (!this.enabled || !this.musicEnabled) return;
    const ctx = this.currentContext || 'menu';
    console.log(`[Audio] DEBUG SKIP. Context: ${ctx}`);

    const next = this.getRandomTrack(ctx);
    if (next) this.fadeOutAndPlay(next);
  }

  // --- SFX ---

  resolveAudioSrc(src) {
    if (!src || typeof window === 'undefined') return src;
    try {
      return new URL(src, window.location.href).href;
    } catch {
      return src;
    }
  }

  resolveVoiceSrc(src) {
    const resolved = this.resolveAudioSrc(src);
    if (!resolved || typeof window === 'undefined') return resolved;
    try {
      const url = new URL(resolved, window.location.href);
      url.searchParams.set('v', BUILD_ID || 'dev');
      return url.href;
    } catch {
      const separator = String(resolved).includes('?') ? '&' : '?';
      return `${resolved}${separator}v=${encodeURIComponent(BUILD_ID || 'dev')}`;
    }
  }

  isVerboseDiagnostics() {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search);
      return window.__burtVerboseLogs === true || params.get('debug') === '1' || params.get('verboseLogs') === '1';
    } catch {
      return false;
    }
  }

  prepareSfxAudio(audio, resolvedSrc) {
    audio.preload = 'auto';
    if (audio.src !== resolvedSrc) {
      audio.src = resolvedSrc;
    }
    try {
      audio.currentTime = 0;
    } catch { }
    return audio;
  }

  checkSfxAsset(srcUrl) {
    if (!srcUrl) return Promise.resolve({ ok: false, status: 0, type: null });
    if (!this.sfxAssetHealth.has(srcUrl)) {
      const check = fetch(srcUrl, {
        cache: 'no-store',
        headers: { Range: 'bytes=0-0' }
      }).then((res) => ({
        ok: res.ok,
        status: res.status,
        type: res.headers.get('content-type') || ''
      })).catch((error) => ({
        ok: false,
        status: 0,
        type: '',
        error: error?.message || String(error)
      }));
      this.sfxAssetHealth.set(srcUrl, check);
    }
    return this.sfxAssetHealth.get(srcUrl);
  }

  handleSfxPlayFailure(eventName, srcUrl, error) {
    const errorName = error?.name || 'Error';
    if (errorName === 'AbortError' || errorName === 'NotAllowedError') return;

    if (!this._warnedUrls) this._warnedUrls = new Set();
    const warningKey = `${errorName}:${srcUrl}`;
    if (this._warnedUrls.has(warningKey)) return;
    this._warnedUrls.add(warningKey);

    if (errorName === 'NotSupportedError') {
      this.checkSfxAsset(srcUrl).then((asset) => {
        if (!asset.ok || (asset.type && asset.type.includes('text/html'))) {
          const detail = asset.status ? `HTTP ${asset.status}` : (asset.error || error?.message || 'unknown failure');
          console.error(`[AudioManager] SFX asset unavailable for key="${eventName}" (${detail}): ${srcUrl}`);
        } else if (this.isVerboseDiagnostics()) {
          console.warn(`[AudioManager] SFX decode/playback hiccup for key="${eventName}" src="${srcUrl}" type="${asset.type}"`);
        }
      });
      return;
    }

    if (this.isVerboseDiagnostics()) {
      console.warn(`[AudioManager] Play failed for key="${eventName}" src="${srcUrl}" error="${errorName}: ${error?.message || ''}"`);
    }
  }

  playSfx(eventName, options = {}) {
    if (!this.enabled) return false;

    // Filter "blipp blopp" -> 'computerNoise' usage
    // If eventName is specifically one we hate, mapped here
    if (eventName === 'bad_sound') return;

    const originalName = eventName;
    if (this.sfxDenylist && this.sfxDenylist.has(eventName)) {
      eventName = 'shoot_small';
      if (!this.sfxDenylistLogged[originalName]) {
        console.warn(`[Audio] SFX denylist applied from ${originalName} to ${eventName}`);
        this.sfxDenylistLogged[originalName] = true;
      }
    }


    // 1. Get variants with Fallback
    let variants = SFX_CATALOG[eventName];
    if (!variants || variants.length === 0) {
      if (!this._missingKeysLogged) this._missingKeysLogged = new Set();
      if (!this._missingKeysLogged.has(eventName)) {
        console.warn(`[AudioManager] Unknown SFX key: "${eventName}". Falling back to default.`);
        this._missingKeysLogged.add(eventName);
      }
      // Fallback to ensuring not silent
      variants = SFX_CATALOG['shoot_small'];
      if (!variants) return false;
    }
    const mix = SFX_MIX[eventName] || {};

    // 2. Cooldown
    const now = Date.now();
    const minIntervalMs = this.readMixNumber(options.minIntervalMs, mix.minIntervalMs ?? 50);
    if (!options.force && this.sfxCooldowns[eventName] && now < this.sfxCooldowns[eventName]) {
      return false;
    }
    this.sfxCooldowns[eventName] = now + minIntervalMs;

    // 3. Pick variant
    const src = variants[Math.floor(Math.random() * variants.length)];

    // 4. Play
    if (!src) return false;

    const audio = this.getSfxAudio(eventName, src, options);
    const volumeMultiplier = this.readMixNumber(options.volume, mix.volume ?? 1.0);
    audio.volume = this.clampUnit(this.masterVolume * this.sfxVolume * volumeMultiplier);
    audio.play().catch(e => {
      this.handleSfxPlayFailure(eventName, audio.src, e);
    });
    this.lastSfxPlayedAt[eventName] = now;
    this.lastSfxEvent = eventName;
    this.lastSfxTrack = decodeURIComponent((src || '').split('/').pop() || '');
    return true;
  }

  play(name) {
    if (this.enabled) this.playSfx(name);
  }

  getSfxAudio(eventName, src, options) {
    const resolvedSrc = this.resolveAudioSrc(src);
    const usePool = options.pool || this.pooledSfxKeys.has(eventName);
    if (!usePool) {
      const audio = new Audio(resolvedSrc);
      audio.preload = 'auto';
      return audio;
    }

    const poolSize = options.poolSize || (eventName === 'shoot_small' ? 8 : 4);
    const poolKey = `${eventName}:${resolvedSrc}`;
    if (!this.sfxPools[poolKey]) {
      this.sfxPools[poolKey] = Array.from({ length: poolSize }, () => this.prepareSfxAudio(new Audio(), resolvedSrc));
      this.sfxPoolIndex[poolKey] = 0;
    }

    const pool = this.sfxPools[poolKey];
    let index = this.sfxPoolIndex[poolKey] || 0;
    const audio = pool[index % pool.length];
    this.sfxPoolIndex[poolKey] = (index + 1) % pool.length;
    return this.prepareSfxAudio(audio, resolvedSrc);
  }

  recoverSfx(reason = 'unknown') {
    if (!this.enabled) return;
    if (this.context && this.context.state === 'suspended') {
      this.context.resume().catch(() => { });
    }
    if (this.lastSfxPlayedAt.shoot_small && Date.now() - this.lastSfxPlayedAt.shoot_small < 200) {
      return;
    }
    this.playSfx('shoot_small', { force: true, pool: true, volume: 0.6 });
  }

  // --- MUSIC ---

  playMusicContext(contextName, options = {}) {
    if (!this.enabled || !this.musicEnabled) return;

    const playlists = getMusicPlaylists(this.musicPack);
    const newPlaylist = playlists[contextName];
    if (!newPlaylist || newPlaylist.length === 0) {
      console.warn(`[Audio] Unknown or empty context: ${contextName}`);
      return;
    }

    // Only set playlist ref (it's shared anyway)
    this.playlist = newPlaylist;

    const isReset = options.resetForNewRun || options.resetPlaylist;
    const contextChanged = this.currentContext !== contextName;
    const isPlaying = !this.musicAudio.paused && this.musicAudio.currentTime > 0;
    const activeTrackSrc = this.currentTrackSrc || this.musicAudio?.src || '';
    const currentTrackMatchesContext = this.trackBelongsToPlaylist(activeTrackSrc, newPlaylist);

    console.log(`[Audio] Request Context: ${contextName}, Current: ${this.currentContext}, Reset: ${!!isReset}`);

    if (contextName === 'gameplay' && options.resetForNewRun) {
      // FORCE RULE: New Run starts on the lead track for the selected music pack.
      const forcedTrack = newPlaylist[0] || AssetManifest.audio.music.find(p => p.includes('nova_swarm_gameplay_laser_lane')) || '/audio/music/nova-swarm/nova_swarm_gameplay_laser_lane.mp3';
      this.currentContext = 'gameplay';
      // Set last track IMMEDIATELY so it won't be picked next
      this.lastTrackByContext.gameplay = forcedTrack;
      console.log('[Audio] forcing new run track:', forcedTrack);
      this.fadeOutAndPlay(forcedTrack);
      return;
    }

    if (contextChanged) {
      const keepCurrentTrack = isPlaying && !isReset && this.shouldKeepTrackAcrossContexts(this.currentContext, contextName);

      // Just switch state
      this.currentContext = contextName;

      // Menu <-> scoreboard can remain seamless. Gameplay, boss, victory, and gameover need explicit identity.
      if (keepCurrentTrack) {
        console.log(`[Audio] Context changed to ${contextName} but keeping current track.`);
        return;
      }
    }

    // If we are here, either context is same OR we are not playing.
    if (!isPlaying || contextChanged || isReset || !currentTrackMatchesContext) {
      const next = this.getRandomTrack(contextName);
      this.fadeOutAndPlay(next);
    }
  }

  shouldKeepTrackAcrossContexts(fromContext, toContext) {
    const seamlessContexts = new Set(['menu', 'scoreboard']);
    return seamlessContexts.has(fromContext) && seamlessContexts.has(toContext);
  }

  trackBelongsToPlaylist(src, playlist) {
    if (!src || !playlist?.length) return false;
    let normalizedSrc = src;
    try {
      normalizedSrc = decodeURIComponent(src);
    } catch { }
    return playlist.some((track) => track === src || track === normalizedSrc || normalizedSrc.endsWith(track));
  }

  getRandomTrack(context) {
    if (!this.playlist || this.playlist.length === 0) return null;
    if (this.playlist.length === 1) return this.playlist[0];

    // Filter out last played IN THIS CONTEXT
    const lastTrackSrc = this.lastTrackByContext[context];

    // Also avoid currently loaded track to prevent immediate replay
    const currentSrc = this.currentTrackSrc;

    let candidates = this.playlist.filter(t => t !== lastTrackSrc && t !== currentSrc);

    // Fallback if filtering removed everything (e.g. only 2 tracks available and switching between them)
    if (candidates.length === 0) {
      candidates = this.playlist.filter(t => t !== currentSrc);
    }
    if (candidates.length === 0) candidates = this.playlist;

    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  fadeOutAndPlay(nextSrc) {
    if (!nextSrc) return;

    // Clear any existing fade
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    // Reset retry count on new explicit request
    this.retryCount = 0;

    this.startTrack(nextSrc);
  }

  startTrack(src) {
    if (!src) return;
    if (this.isSwitchingTrack) {
      this.pendingTrackRequest = {
        src,
        context: this.currentContext
      };
      const switchAgeMs = Date.now() - (this.switchStartedAt || 0);
      if (this.musicAudio.paused || switchAgeMs > 1200) {
        this.clearPendingTrackTimer();
        this.isSwitchingTrack = false;
        this.playPendingTrackRequest();
      } else {
        this.armPendingTrackRetry();
      }
      return;
    }

    // Update state
    this.currentTrackSrc = src;
    if (this.currentContext) {
      this.lastTrackByContext[this.currentContext] = src;
    }

    this.isSwitchingTrack = true;
    this.switchStartedAt = Date.now();
    const switchToken = ++this.trackSwitchToken;
    this.musicAudio.src = src;
    this.applyMusicVolume();

    console.log(`[Audio] Playing: ${src} (Context: ${this.currentContext})`);

    const playPromise = this.musicAudio.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        if (switchToken !== this.trackSwitchToken) return;
        this.retryCount = 0; // Success reset
        this.isSwitchingTrack = false;
        this.switchStartedAt = 0;
        if (this.playPendingTrackRequest()) return;
        console.log("[Audio] Music playback confirmed");
      }).catch(e => {
        if (switchToken !== this.trackSwitchToken) return;
        this.isSwitchingTrack = false;
        this.switchStartedAt = 0;
        if (this.playPendingTrackRequest()) return;
        if (e.name === 'AbortError') {
          console.log('[Audio] Play interrupted by new request (AbortError). Ignoring.');
        } else if (e.name === 'NotAllowedError') {
          console.log('[Audio] Autoplay blocked. Waiting for gesture...');
          this.addUnlockListener(src);
        } else {
          console.warn(`[Audio] Play failed: ${src}`, e);
          this.onTrackError(e);
        }
      });
    } else {
      this.isSwitchingTrack = false;
      this.switchStartedAt = 0;
      this.playPendingTrackRequest();
    }
  }

  playPendingTrackRequest() {
    const pending = this.pendingTrackRequest;
    if (!pending?.src) return false;

    this.clearPendingTrackTimer();
    this.pendingTrackRequest = null;
    if (pending.context) {
      this.currentContext = pending.context;
    }

    if (pending.src === this.currentTrackSrc && !this.musicAudio.paused) {
      if (pending.context) this.lastTrackByContext[pending.context] = pending.src;
      return false;
    }

    this.startTrack(pending.src);
    return true;
  }

  armPendingTrackRetry(delayMs = 650) {
    this.clearPendingTrackTimer();
    this.pendingTrackTimer = setTimeout(() => {
      if (!this.pendingTrackRequest) return;
      this.isSwitchingTrack = false;
      this.switchStartedAt = 0;
      this.playPendingTrackRequest();
    }, delayMs);
  }

  clearPendingTrackTimer() {
    if (!this.pendingTrackTimer) return;
    clearTimeout(this.pendingTrackTimer);
    this.pendingTrackTimer = null;
  }

  onTrackEnded() {
    console.log(`[Audio] Track Ended. Context: ${this.currentContext}`);
    // Pick next random, respecting current context history
    const next = this.getRandomTrack(this.currentContext || 'menu');
    if (next) {
      this.startTrack(next);
    }
  }

  onTrackError(e) {
    console.error('[Audio] Track Error:', e);
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`[Audio] Retrying (${this.retryCount}/${this.maxRetries})...`);
      setTimeout(() => {
        const next = this.getRandomTrack(this.currentContext || 'menu');
        this.startTrack(next);
      }, 250);
    } else {
      console.error('[Audio] Max retries reached. Stopping music.');
    }
  }

  playMusic(index = 0) {
    this.playMusicContext('menu');
  }

  stopMusic() {
    this.musicAudio.pause();
  }

  applyMusicVolume() {
    this.musicAudio.volume = this.clampUnit(this.masterVolume * this.musicVolume * this.musicDuckFactor * this.pauseDuckFactor);
  }

  duckMusic(factor = 0.55, durationMs = 1700) {
    if (!this.enabled || !this.musicEnabled) return;
    this.musicDuckFactor = Math.max(0.2, Math.min(1, factor));
    this.applyMusicVolume();
    if (this.duckTimer) {
      clearTimeout(this.duckTimer);
    }
    this.duckTimer = setTimeout(() => {
      this.musicDuckFactor = 1;
      this.duckTimer = null;
      this.applyMusicVolume();
    }, durationMs);
  }

  setPauseDucked(paused) {
    this.pauseDuckFactor = paused ? 0.42 : 1;
    this.applyMusicVolume();
  }

  getSettings() {
    const musicSrc = this.musicAudio?.src || '';
    const describeVoiceEntry = (entry) => {
      const src = entry?.src || '';
      const filename = decodeURIComponent((src.split('/').pop() || '').split('?')[0] || '');
      return {
        eventName: entry?.eventName || null,
        group: entry?.exclusiveGroup || null,
        track: filename,
        src,
        cacheBust: src.includes('?') ? new URLSearchParams(src.split('?')[1]).get('v') : null,
        paused: Boolean(entry?.audio?.paused),
        ended: Boolean(entry?.audio?.ended)
      };
    };
    return {
      masterVolume: this.masterVolume,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      voiceVolume: this.voiceVolume,
      musicEnabled: this.musicEnabled,
      voiceEnabled: this.voiceEnabled,
      musicDuckFactor: this.musicDuckFactor,
      pauseDuckFactor: this.pauseDuckFactor,
      currentMusicContext: this.currentContext,
      musicPack: this.musicPack,
      musicPlaying: Boolean(this.musicAudio && !this.musicAudio.paused && this.musicAudio.currentTime > 0),
      musicReadyState: this.musicAudio?.readyState || 0,
      currentMusicTrack: musicSrc ? decodeURIComponent(musicSrc.split('/').pop() || '') : null,
      lastSfxEvent: this.lastSfxEvent,
      lastSfxTrack: this.lastSfxTrack,
      lastVoiceEvent: this.lastVoiceEvent,
      lastVoiceTrack: this.lastVoiceTrack,
      activeVoiceCount: this.activeVoices?.size || 0,
      activeVoiceEvents: Array.from(this.activeVoices?.values?.() || []).map(describeVoiceEntry),
      activeVoiceGroups: Object.fromEntries(Object.entries(this.activeVoiceGroups || {}).map(([group, entry]) => [
        group,
        describeVoiceEntry(entry)
      ]))
    };
  }

  setVolume(kind, value) {
    const clamped = Math.max(0, Math.min(1, Number(value) || 0));
    const keyMap = {
      master: 'masterVolume',
      music: 'musicVolume',
      sfx: 'sfxVolume',
      voice: 'voiceVolume'
    };
    const prop = keyMap[kind];
    if (!prop) return this.getSettings();

    this[prop] = clamped;
    try {
      localStorage.setItem(`burt_volume_${kind}`, String(clamped));
    } catch { }
    this.applyMusicVolume();
    return this.getSettings();
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = Boolean(enabled) && Features.MUSIC_ENABLED;
    try {
      localStorage.setItem('burt_music_enabled', this.musicEnabled);
    } catch { }

    if (this.musicEnabled) {
      const ctx = this.currentContext || 'menu';
      this.playMusicContext(ctx);
    } else {
      this.stopMusic();
    }
    return this.musicEnabled;
  }

  setMusicPack(pack) {
    const nextPack = normalizeMusicPack(pack);
    if (nextPack === this.musicPack) return this.getSettings();
    this.musicPack = nextPack;
    this.lastTrackByContext = Object.fromEntries(Object.keys(this.lastTrackByContext).map((context) => [context, null]));
    try {
      localStorage.setItem('burt_music_pack', this.musicPack);
    } catch { }
    if (this.musicEnabled && this.currentContext) {
      this.playMusicContext(this.currentContext, { resetPlaylist: true });
    }
    return this.getSettings();
  }

  setVoiceEnabled(enabled) {
    this.voiceEnabled = Boolean(enabled) && Features.VOICE_ENABLED;
    try {
      localStorage.setItem('burt_voice_enabled', this.voiceEnabled);
    } catch { }
    return this.voiceEnabled;
  }

  toggleMute() {
    return this.setMusicEnabled(!this.musicEnabled);
  }

  // --- VOICE ---

  handleVoicePlayFailure(eventName, srcUrl, error) {
    const errorName = error?.name || 'Error';
    if (errorName === 'AbortError' || errorName === 'NotAllowedError') return;

    if (errorName === 'NotSupportedError') {
      this.checkSfxAsset(srcUrl).then((asset) => {
        if (!asset.ok || (asset.type && asset.type.includes('text/html'))) {
          const detail = asset.status ? `HTTP ${asset.status}` : (asset.error || error?.message || 'unknown failure');
          console.error(`[AudioManager] Voice asset unavailable for key="${eventName}" (${detail}): ${srcUrl}`);
        } else if (this.isVerboseDiagnostics()) {
          console.warn(`[AudioManager] Voice decode/playback hiccup for key="${eventName}" src="${srcUrl}" type="${asset.type}"`);
        }
      });
      return;
    }

    if (this.isVerboseDiagnostics()) {
      console.warn(`[AudioManager] Voice play failed for key="${eventName}" src="${srcUrl}" error="${errorName}: ${error?.message || ''}"`);
    }
  }

  playVoice(eventName, options = {}) {
    if (!this.enabled || !this.voiceEnabled) return false;
    const now = Date.now();
    const mix = VOICE_MIX[eventName] || {};
    const cooldownMs = this.readMixNumber(options.cooldownMs, mix.cooldownMs ?? 1500);
    const force = options.force === true;
    if (options.stopOtherVoices === true) {
      this.stopAllVoices('exclusive_voice_request');
    }

    // Celebration Rate Limiting
    const celebrations = [
      'mission_control_wave_clear',
      'mission_control_victory',
      'mission_control_local_highscore',
      'mission_control_global_highscore',
      'mission_control_top3_highscore',
      'mission_control_number_one_highscore',
      'mission_control_near_miss',
      'mission_control_personal_best'
    ];
    if (celebrations.includes(eventName)) {
      if (!force && now < this.globalVoiceCooldown) return false; // Respect global
      // Also enforce a specific celebration lock
      if (!force && this.lastCelebrationTime && now - this.lastCelebrationTime < 20000) {
        console.log('[Audio] Skipping celebration voice due to rate limit');
        return false;
      }
      this.lastCelebrationTime = now;
    } else {
      // Normal voice lines
      if (!force && now < this.globalVoiceCooldown) return false;
    }

    // 1. Lookup in Catalog first (supports arrays/variants)
    let variants = SFX_CATALOG[eventName];

    // 2. Fallback to direct mapping or loose match (Legacy support)
    if (!variants) {
      const filename = VOICE_EVENT_FALLBACKS[eventName];
      if (filename) {
        const found = AssetManifest.audio.voice.find(p => p.endsWith(filename));
        if (found) variants = [found];
      }
    }

    if (variants && variants.length > 0) {
      const src = this.pickVoiceVariant(eventName, variants);
      if (src) {
        const exclusiveGroup = options.exclusiveGroup || (eventName.startsWith('mission_control_') ? 'announcer' : null);
        if (exclusiveGroup) this.stopVoiceGroup(exclusiveGroup);
        const resolvedSrc = this.resolveVoiceSrc(src);
        const audio = new Audio(resolvedSrc);
        audio.preload = 'auto';
        const volumeMultiplier = this.readMixNumber(options.volume, mix.volume ?? 1.0);
        audio.volume = this.clampUnit(this.masterVolume * this.voiceVolume * volumeMultiplier);
        const voiceId = ++this.voicePlayId;
        const entry = { audio, eventName, src: resolvedSrc, exclusiveGroup };
        this.activeVoices.set(voiceId, entry);
        const cleanupVoice = () => {
          if (this.activeVoices.get(voiceId)?.audio === audio) {
            this.activeVoices.delete(voiceId);
          }
          if (exclusiveGroup && this.activeVoiceGroups[exclusiveGroup]?.audio === audio) {
            delete this.activeVoiceGroups[exclusiveGroup];
          }
        };
        if (exclusiveGroup) {
          this.activeVoiceGroups[exclusiveGroup] = entry;
        }
        audio.addEventListener('ended', cleanupVoice, { once: true });
        audio.play().catch(e => {
          cleanupVoice();
          this.handleVoicePlayFailure(eventName, audio.src, e);
        });
        this.duckMusic(
          this.readMixNumber(options.duckFactor, mix.duckFactor ?? 0.5),
          this.readMixNumber(options.duckMs, mix.duckMs ?? 1900)
        );
        this.globalVoiceCooldown = now + cooldownMs;
        this.lastVoicePlayedAt[eventName] = now;
        this.lastVoiceEvent = eventName;
        this.lastVoiceTrack = decodeURIComponent((src || '').split('/').pop()?.split('?')[0] || '');
        return true;
      }
    } else {
      console.warn(`[Audio] No voice asset found for: ${eventName}`);
    }
    return false;
  }

  pickVoiceVariant(eventName, variants) {
    const pool = Array.isArray(variants) ? variants.filter(Boolean) : [];
    if (pool.length <= 1) return pool[0] || null;

    if (!Array.isArray(this.voiceVariantBags[eventName]) || this.voiceVariantBags[eventName].length === 0) {
      const lastIndex = this.lastVoiceVariantByEvent[eventName];
      const bag = pool.map((_, index) => index).filter((index) => index !== lastIndex);
      this.voiceVariantBags[eventName] = bag.length ? bag : pool.map((_, index) => index);
    }

    const bag = this.voiceVariantBags[eventName];
    const pick = Math.floor(Math.random() * bag.length);
    const [index] = bag.splice(pick, 1);
    this.lastVoiceVariantByEvent[eventName] = index;
    return pool[index] || pool[0] || null;
  }

  stopVoiceGroup(groupName) {
    const active = this.activeVoiceGroups?.[groupName];
    if (!active?.audio) return false;
    try {
      active.audio.pause();
      active.audio.currentTime = 0;
    } catch { }
    for (const [voiceId, entry] of this.activeVoices || []) {
      if (entry?.audio === active.audio || entry?.exclusiveGroup === groupName) {
        this.activeVoices.delete(voiceId);
      }
    }
    delete this.activeVoiceGroups[groupName];
    return true;
  }

  stopAllVoices(reason = 'manual') {
    let stopped = 0;
    for (const [voiceId, entry] of this.activeVoices || []) {
      if (!entry?.audio) continue;
      try {
        entry.audio.pause();
        entry.audio.currentTime = 0;
      } catch { }
      this.activeVoices.delete(voiceId);
      stopped += 1;
    }
    this.activeVoiceGroups = {};
    if (stopped && this.isVerboseDiagnostics()) {
      console.log(`[Audio] stopped ${stopped} active voice(s): ${reason}`);
    }
    return stopped;
  }

  playAuditionCue(kind) {
    if (kind === 'sfx') {
      return this.playSfx('achievement', { force: true, volume: 0.78, minIntervalMs: 0 });
    }
    if (kind === 'voice') {
      return this.playVoice('mission_control_launch', {
        force: true,
        volume: 0.78,
        duckFactor: 0.54,
        duckMs: 1200,
        cooldownMs: 0
      });
    }
    return false;
  }

  playPowerupVoice() {
    return this.playVoice('mission_control_powerup', {
      cooldownMs: 28000,
      duckMs: 900,
      duckFactor: 0.52,
      volume: 0.72
    });
  }

  playTone(freq, duration, type, vol) {
    // DISABLE GLOBAL FALLBACK
    // The user has explicitly requested this to be dead.
    // console.log('[AudioManager] playTone fallback prevented.'); 
    return;
  }

  update(delta) {
    if (!this.pendingTrackRequest?.src) return;
    const switchAgeMs = Date.now() - (this.switchStartedAt || 0);
    if (!this.isSwitchingTrack || this.musicAudio.paused || switchAgeMs > 650) {
      this.clearPendingTrackTimer();
      this.isSwitchingTrack = false;
      this.switchStartedAt = 0;
      this.playPendingTrackRequest();
    }
  }
}

export const AudioManager = new AudioController();
