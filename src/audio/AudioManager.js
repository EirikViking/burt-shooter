// Simple Web Audio API implementation
// Since we can't easily generate audio assets, we'll create synthetic sounds

class SimpleAudio {
  constructor() {
    this.context = null;
    this.sounds = {};
    this.music = null;
    this.enabled = true;
  }

  init() {
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.createSounds();
    } catch (error) {
      this.enabled = false;
    }
  }

  createSounds() {
    // We'll generate simple synthetic sounds using oscillators
    this.sounds = {
      shoot: () => this.playTone(800, 0.05, 'square', 0.1),
      explosion: () => this.playNoise(0.2, 0.05),
      hit: () => this.playTone(400, 0.05, 'sawtooth', 0.1),
      playerHit: () => this.playNoise(0.3, 0.1),
      powerup: () => this.playChord([440, 554, 659], 0.3, 0.1),
      menuSelect: () => this.playTone(600, 0.1, 'sine', 0.15),
      gameOver: () => this.playDescendingTone(400, 200, 0.5, 0.2)
    };
  }

  playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!this.enabled || !this.context) return;

    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + duration);
  }

  playNoise(duration, volume = 0.3) {
    if (!this.enabled || !this.context) return;

    const bufferSize = this.context.sampleRate * duration;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.context.createBufferSource();
    const gainNode = this.context.createGain();

    noise.buffer = buffer;
    noise.connect(gainNode);
    gainNode.connect(this.context.destination);

    gainNode.gain.setValueAtTime(volume, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

    noise.start(this.context.currentTime);
  }

  playChord(frequencies, duration, volume = 0.2) {
    frequencies.forEach(freq => {
      this.playTone(freq, duration, 'sine', volume / frequencies.length);
    });
  }

  playDescendingTone(startFreq, endFreq, duration, volume = 0.3) {
    if (!this.enabled || !this.context) return;

    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);

    oscillator.frequency.setValueAtTime(startFreq, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, this.context.currentTime + duration);
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(volume, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + duration);
  }

  play(soundName) {
    if (!this.enabled || !this.sounds[soundName]) return;

    try {
      this.sounds[soundName]();
    } catch (e) {
      console.warn('Failed to play sound:', soundName, e);
    }
  }

  playMusic(type) {
    // Simple background music loop
    if (!this.enabled || !this.context) return;

    this.stopMusic();
    this.musicInterval = setInterval(() => {
      // Play a simple melody
      const melody = [440, 494, 523, 587, 523, 494];
      let delay = 0;
      melody.forEach((freq, i) => {
        setTimeout(() => {
          this.playTone(freq, 0.2, 'sine', 0.05);
        }, delay);
        delay += 300;
      });
    }, 2000);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const AudioManager = new SimpleAudio();
