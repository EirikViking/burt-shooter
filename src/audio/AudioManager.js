import { AssetManifest } from '../assets/assetManifest.js';
import * as Features from '../config/Features.js';
import { SFX_CATALOG, MUSIC_PLAYLISTS } from './SoundCatalog.js';

class AudioController {
  constructor() {
    this.context = null;
    this.enabled = false;
    this.musicEnabled = false;
    this.voiceEnabled = false;

    // Volume
    this.masterVolume = 0.3;
    this.musicVolume = 0.2;
    this.sfxVolume = 0.4;
    this.voiceVolume = 0.5;

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
      menu: null,
      scoreboard: null,
      gameplay: null
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

    // Safety lock
    this.isSwitchingTrack = false;

    // Idempotency guard
    this._initialized = false;
    this._debugKeyHandler = null;

    // SFX denylist (bad/annoying variants)
    this.sfxDenylist = new Set(['shoot_alt']);
    this.sfxDenylistLogged = {};
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

      const savedMusic = localStorage.getItem('burt_music_enabled');
      this.musicEnabled = savedMusic !== 'false' && Features.MUSIC_ENABLED;
      this.voiceEnabled = Features.VOICE_ENABLED;

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
        if (pendingSrc) {
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

  playSfx(eventName, options = {}) {
    if (!this.enabled) return;

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
      if (!this.sfxDenylistLogged[eventName]) {
        console.warn(`[AudioManager] Unknown SFX key: "${eventName}". Falling back to default.`);
        this.sfxDenylistLogged[eventName] = true;
      }
      // Fallback to ensuring not silent
      variants = SFX_CATALOG['shoot_small'];
      if (!variants) return false;
    }

    // 2. Cooldown
    const now = Date.now();
    const minIntervalMs = Number.isFinite(options.minIntervalMs) ? options.minIntervalMs : 50;
    if (!options.force && this.sfxCooldowns[eventName] && now < this.sfxCooldowns[eventName]) {
      return false;
    }
    this.sfxCooldowns[eventName] = now + minIntervalMs;

    // 3. Pick variant
    const src = variants[Math.floor(Math.random() * variants.length)];

    // 4. Play
    if (!src) return false;

    const audio = this.getSfxAudio(eventName, src, options);
    audio.volume = Math.max(0, Math.min(1, this.masterVolume * this.sfxVolume * (options.volume || 1.0)));
    audio.play().catch(e => {
      if (e.name !== 'AbortError') {
        console.warn(`[AudioManager] Play failed for ${eventName}:`, e);
      }
    });
    this.lastSfxPlayedAt[eventName] = now;
    return true;
  }

  play(name) {
    if (this.enabled) this.playSfx(name);
  }

  getSfxAudio(eventName, src, options) {
    const usePool = options.pool || eventName === 'shoot_small';
    if (!usePool) {
      return new Audio(src);
    }

    const poolSize = options.poolSize || 6;
    if (!this.sfxPools[eventName]) {
      this.sfxPools[eventName] = Array.from({ length: poolSize }, () => {
        const audio = new Audio(src);
        audio.preload = 'auto';
        return audio;
      });
      this.sfxPoolIndex[eventName] = 0;
    }

    const pool = this.sfxPools[eventName];
    let index = this.sfxPoolIndex[eventName] || 0;
    const audio = pool[index % pool.length];
    this.sfxPoolIndex[eventName] = (index + 1) % pool.length;
    if (audio.src !== src) audio.src = src;
    return audio;
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

    const newPlaylist = MUSIC_PLAYLISTS[contextName];
    if (!newPlaylist || newPlaylist.length === 0) {
      console.warn(`[Audio] Unknown or empty context: ${contextName}`);
      return;
    }

    // Only set playlist ref (it's shared anyway)
    this.playlist = newPlaylist;

    const isReset = options.resetForNewRun || options.resetPlaylist;
    const contextChanged = this.currentContext !== contextName;
    const isPlaying = !this.musicAudio.paused && this.musicAudio.currentTime > 0;

    console.log(`[Audio] Request Context: ${contextName}, Current: ${this.currentContext}, Reset: ${!!isReset}`);

    if (contextName === 'gameplay' && options.resetForNewRun) {
      // FORCE RULE: New Run -> bgm_v2.mp3
      const forcedTrack = AssetManifest.audio.music.find(p => p.includes('bgm_v2.mp3')) || '/audio/music/bgm_v2.mp3';
      this.currentContext = 'gameplay';
      // Set last track IMMEDIATELY so it won't be picked next
      this.lastTrackByContext.gameplay = forcedTrack;
      console.log('[Audio] forcing new run track:', forcedTrack);
      this.fadeOutAndPlay(forcedTrack);
      return;
    }

    if (contextChanged) {
      // Just switch state
      this.currentContext = contextName;

      // If playing, we KEEP playing (seamless transition)
      // Unless user explicitly asked for reset, which we handled above for gameplay-reset.
      // If logic required random reset on context switch, we'd do it here. 
      // But requirement "Switching menu <-> scoreboard must NOT restart" means we do NOTHING to audio.
      if (isPlaying) {
        console.log(`[Audio] Context changed to ${contextName} but keeping current track.`);
        return;
      }
    }

    // If we are here, either context is same OR we are not playing.
    if (!isPlaying) {
      const next = this.getRandomTrack(contextName);
      this.fadeOutAndPlay(next);
    }
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
    if (this.isSwitchingTrack) return;

    // Update state
    this.currentTrackSrc = src;
    if (this.currentContext) {
      this.lastTrackByContext[this.currentContext] = src;
    }

    this.isSwitchingTrack = true;
    this.musicAudio.src = src;
    this.musicAudio.volume = Math.max(0, Math.min(1, this.masterVolume * this.musicVolume));

    console.log(`[Audio] Playing: ${src} (Context: ${this.currentContext})`);

    const playPromise = this.musicAudio.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.retryCount = 0; // Success reset
        this.isSwitchingTrack = false;
        console.log("[Audio] Music playback confirmed");
      }).catch(e => {
        this.isSwitchingTrack = false;
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
    }
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

  toggleMute() {
    this.musicEnabled = !this.musicEnabled;
    localStorage.setItem('burt_music_enabled', this.musicEnabled);

    if (this.musicEnabled) {
      const ctx = this.currentContext || 'menu';
      this.playMusicContext(ctx);
    } else {
      this.stopMusic();
    }
    return this.musicEnabled;
  }

  // --- VOICE ---

  playVoice(eventName) {
    if (!this.enabled || !this.voiceEnabled) return;
    const now = Date.now();

    // Celebration Rate Limiting
    const celebrations = ['mission_complete', 'wave_clear', 'round'];
    if (celebrations.includes(eventName)) {
      if (now < this.globalVoiceCooldown) return; // Respect global
      // Also enforce a specific celebration lock
      if (this.lastCelebrationTime && now - this.lastCelebrationTime < 20000) {
        console.log('[Audio] Skipping celebration voice due to rate limit');
        return;
      }
      this.lastCelebrationTime = now;
    } else {
      // Normal voice lines
      if (now < this.globalVoiceCooldown) return;
    }

    const map = {
      'ready': 'ready.mp3',
      'go': 'go.mp3',
      'wave_clear': 'objective_achieved.mp3',
      'mission_complete': 'mission_completed.mp3',
      'war_target': 'war_target_engaged.mp3', // Corrected name based on file list
      'round': 'round.mp3',
      'powerup': 'power_up.mp3'
    };

    const filename = map[eventName];
    if (filename) {
      // Lookup in manifest (robust to path changes)
      const src = AssetManifest.audio.voice.find(p => p.endsWith(filename));

      if (src) {
        const audio = new Audio(src);
        audio.volume = Math.max(0, Math.min(1, this.masterVolume * this.voiceVolume));
        audio.play().catch(e => { });
        this.globalVoiceCooldown = now + 1500;
        return true;
      } else {
        console.warn(`[Audio] Voice asset not found for: ${filename}`);
      }
    }
    return false;
  }

  playPowerupVoice() {
    if (!this.enabled || !this.voiceEnabled) return false;

    const candidates = AssetManifest.audio.voice.filter(p => p.includes('power_up'));
    if (!candidates.length) {
      console.warn('[PowerupVoice] played key=none ok=false');
      return false;
    }

    let index = 0;
    if (candidates.length > 1) {
      const next = Math.floor(Math.random() * candidates.length);
      index = next === this.lastPowerupVoiceIndex ? (next + 1) % candidates.length : next;
      this.lastPowerupVoiceIndex = index;
    }

    const src = candidates[index];
    const audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, this.masterVolume * this.voiceVolume));
    audio.play().catch(e => { });
    if (candidates.length > 1) {
      console.log(`[PowerupVoice] picked key=${src} from=${candidates.length}`);
    } else {
      console.log(`[PowerupVoice] played key=${src} ok=true`);
    }
    return true;
  }

  playTone(freq, duration, type, vol) {
    // DISABLE GLOBAL FALLBACK
    // The user has explicitly requested this to be dead.
    // console.log('[AudioManager] playTone fallback prevented.'); 
    return;
  }

  update(delta) { }
}

export const AudioManager = new AudioController();
