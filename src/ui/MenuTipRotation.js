export { MENU_TIPS } from '../i18n/menuTipText.js';

export const MENU_TIP_INITIAL_DELAY_MS = 3000;
export const MENU_TIP_SHOW_RANGE_MS = Object.freeze([8000, 10000]);
export const MENU_TIP_WAIT_RANGE_MS = Object.freeze([12000, 18000]);
export const MENU_TIP_FADE_MS = 650;

function randomBetween([minimum, maximum], rng) {
  return minimum + (maximum - minimum) * Math.max(0, Math.min(1, Number(rng()) || 0));
}

function shuffledIndices(count, rng, avoidFirst = null) {
  const values = Array.from({ length: count }, (_, index) => index);
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.max(0, Math.min(0.999999, Number(rng()) || 0)) * (index + 1));
    [values[index], values[swap]] = [values[swap], values[index]];
  }
  if (values.length > 1 && values[0] === avoidFirst) {
    const swap = 1 + Math.floor(Math.max(0, Math.min(0.999999, Number(rng()) || 0)) * (values.length - 1));
    [values[0], values[swap]] = [values[swap], values[0]];
  }
  return values;
}

export class MenuTipRotation {
  constructor({ tipCount, rng = Math.random } = {}) {
    this.tipCount = Math.max(0, Math.floor(Number(tipCount) || 0));
    this.rng = rng;
    this.queue = shuffledIndices(this.tipCount, this.rng);
    this.phase = 'waiting';
    this.phaseElapsedMs = 0;
    this.waitDurationMs = MENU_TIP_INITIAL_DELAY_MS;
    this.showDurationMs = 0;
    this.index = null;
    this.lastIndex = null;
  }

  getState({ suspended = false } = {}) {
    const remaining = Math.max(0, this.showDurationMs - this.phaseElapsedMs);
    const alpha = this.phase === 'showing'
      ? Math.max(0, Math.min(1, this.phaseElapsedMs / MENU_TIP_FADE_MS, remaining / MENU_TIP_FADE_MS))
      : 0;
    return {
      phase: this.phase,
      phaseElapsedMs: this.phaseElapsedMs,
      waitDurationMs: this.waitDurationMs,
      showDurationMs: this.showDurationMs,
      index: this.index,
      visible: !suspended && this.phase === 'showing',
      alpha: suspended ? 0 : alpha
    };
  }

  update(deltaMs = 0, { suspended = false } = {}) {
    if (suspended || this.tipCount === 0) return this.getState({ suspended });
    let remainingMs = Math.max(0, Number(deltaMs) || 0);
    let guard = 0;
    while (remainingMs >= 0 && guard < 4) {
      const duration = this.phase === 'showing' ? this.showDurationMs : this.waitDurationMs;
      const untilTransition = Math.max(0, duration - this.phaseElapsedMs);
      if (remainingMs < untilTransition) {
        this.phaseElapsedMs += remainingMs;
        break;
      }
      this.phaseElapsedMs = duration;
      remainingMs -= untilTransition;
      if (this.phase === 'showing') this.beginWaiting();
      else this.beginShowing();
      guard += 1;
      if (remainingMs === 0) break;
    }
    return this.getState();
  }

  beginShowing() {
    if (!this.queue.length) this.queue = shuffledIndices(this.tipCount, this.rng, this.lastIndex);
    this.index = this.queue.shift() ?? null;
    this.lastIndex = this.index;
    this.phase = 'showing';
    this.phaseElapsedMs = 0;
    this.showDurationMs = randomBetween(MENU_TIP_SHOW_RANGE_MS, this.rng);
  }

  beginWaiting() {
    this.phase = 'waiting';
    this.phaseElapsedMs = 0;
    this.waitDurationMs = randomBetween(MENU_TIP_WAIT_RANGE_MS, this.rng);
  }
}

