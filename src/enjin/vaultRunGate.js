export const VAULT_RUN_TARGET = 25_000;

function finiteScore(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}
/**
 * Edition-owned score gate. It intentionally knows nothing about Enjin or
 * the renderer so the normal arcade build can keep using Game.addScore with
 * no campaign behavior attached.
 */
export class VaultRunGate {
  constructor({ target = VAULT_RUN_TARGET, onReached = null } = {}) {
    this.target = finiteScore(target) || VAULT_RUN_TARGET;
    this.onReachedCallback = onReached;
    this.reset();
  }

  reset() {
    this.score = 0;
    this.frozen = false;
    this.completed = false;
    this.rawCrossingScore = null;
    this.crossingAward = 0;
    this.crossingState = null;
    this.freezeFrames = 0;
    return this;
  }

  acceptAward(points, state = {}) {
    if (this.frozen) {
      return { applied: 0, score: this.target, frozen: true, completed: this.completed };
    }

    const award = Math.max(0, Math.floor(Number(points) || 0));
    const previousScore = finiteScore(state.previousScore ?? this.score);
    const rawScore = previousScore + award;
    if (rawScore < this.target) {
      this.score = rawScore;
      return { applied: award, score: this.score, rawScore, frozen: false, completed: false };
    }

    const applied = Math.max(0, this.target - previousScore);
    this.score = this.target;
    this.frozen = true;
    this.completed = true;
    this.rawCrossingScore = rawScore;
    this.crossingAward = award;
    this.crossingState = {
      ...state,
      previousScore,
      rawScore,
      awardedScore: applied,
      score: this.target,
      target: this.target
    };
    return {
      applied,
      score: this.target,
      rawScore,
      rawCrossingScore: rawScore,
      crossingAward: award,
      frozen: true,
      completed: true,
      crossingState: this.crossingState
    };
  }

  onReached(payload) {
    if (!this.completed) return;
    this.onReachedCallback?.({
      ...this.crossingState,
      ...payload,
      score: this.target,
      rawCrossingScore: this.rawCrossingScore,
      target: this.target
    });
  }

  onFrozenFrame() {
    if (this.frozen) this.freezeFrames += 1;
  }
}

export function createVaultRunGate(options = {}) {
  return new VaultRunGate(options);
}
