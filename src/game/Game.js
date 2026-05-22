import * as PIXI from 'pixi.js';
import { GameState } from './GameState.js';
import { MenuScene } from '../scenes/MenuScene.js';
import { IntroScene } from '../scenes/IntroScene.js';
import { PlayScene } from '../scenes/PlayScene.js';
import { GameOverScene } from '../scenes/GameOverScene.js';
import { ShipSelectScene } from '../scenes/ShipSelectScene.js';
import { ShipDetailsScene } from '../scenes/ShipDetailsScene.js';
import { HighscoreScene } from '../scenes/HighscoreScene.js';
import { rankManager } from '../managers/RankManager.js';
import { getDefaultShipKey, incrementShipUsage, isShipUnlocked, isValidShipKey, updateShipUnlockProgress } from '../config/ShipMetadata.js';
import { AudioManager } from '../audio/AudioManager.js';
import { analyzeGlobalLeaderboardScore } from '../shared/GlobalLeaderboardPlacement.js';
import { createLeaderboardAdapter } from '../leaderboard/LeaderboardAdapter.js';
import { normalizeScoreDelta } from '../shared/ScorePolicy.js';

export class Game {
  constructor(app) {
    this.app = app;
    this.state = GameState.MENU;
    this.currentScene = null;
    this.currentSceneName = 'boot';
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.scoreMultiplier = 1;

    this.scenes = {
      intro: new IntroScene(this),
      menu: new MenuScene(this),
      shipSelect: null, // Created on demand
      play: new PlayScene(this),
      gameOver: new GameOverScene(this),
      highscore: new HighscoreScene(this)
    };
    this.selectedShipId = null;
    this.isDebugRun = false;
    this.runMode = 'ranked';
    this.runModeReason = null;
    this.globalLeaderboardTargets = null;
    this.globalLeaderboardTargetPromise = null;
    this.globalLeaderboardCueState = {
      global: false,
      top3: false,
      number1: false
    };
    this.leaderboardAdapter = createLeaderboardAdapter();
  }

  start() {
    this.switchScene('menu');
  }

  showIntro() {
    this.switchScene('intro');
  }

  showMenu() {
    this.switchScene('menu');
  }

  switchScene(sceneName) {
    if (this.currentScene) {
      this.app.stage.removeChild(this.currentScene.container);
      if (this.currentScene.cleanup) {
        this.currentScene.cleanup();
      }
      if (typeof this.currentScene.destroy === 'function') {
        this.currentScene.destroy();
      }
    }

    this.currentScene = this.scenes[sceneName];
    this.currentSceneName = sceneName;
    this.app.stage.addChild(this.currentScene.container);
    this.currentScene.init();
  }

  async showShipSelect() {
    // Create ship select scene if not exists OR recreate it to ensure fresh input state
    // Fixing bug where returning from Details broke input
    if (this.scenes.shipSelect) {
      if (this.scenes.shipSelect.destroy) this.scenes.shipSelect.destroy();
      this.scenes.shipSelect = null;
    }

    this.scenes.shipSelect = new ShipSelectScene(this);
    await this.scenes.shipSelect.create();

    // Remove current scene
    if (this.currentScene) {
      this.app.stage.removeChild(this.currentScene.container);
      if (this.currentScene.cleanup) {
        this.currentScene.cleanup();
      }
    }

    // Show ship select
    this.currentScene = this.scenes.shipSelect;
    this.currentSceneName = 'shipSelect';
    this.app.stage.addChild(this.currentScene.container);
  }

  async showShipDetails(spriteKey) {
    // Create ship details scene
    const detailsScene = new ShipDetailsScene(this, spriteKey);
    await detailsScene.create();

    // Remove current scene
    if (this.currentScene) {
      this.app.stage.removeChild(this.currentScene.container);
      if (this.currentScene.cleanup) {
        this.currentScene.cleanup();
      }
    }

    // Show ship details
    this.currentScene = detailsScene;
    this.currentSceneName = 'shipDetails';
    this.app.stage.addChild(this.currentScene.container);
  }

  async startGame(spriteKey) {
    const candidateSpriteKey = isValidShipKey(spriteKey) ? spriteKey : getDefaultShipKey();
    const selectedSpriteKey = isShipUnlocked(candidateSpriteKey) ? candidateSpriteKey : getDefaultShipKey();
    console.log('[Game] starting new game spriteKey=' + selectedSpriteKey);
    this.selectedShipSpriteKey = selectedSpriteKey;

    // Increment ship usage count
    incrementShipUsage(selectedSpriteKey);

    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.isDebugRun = false;
    this.runMode = 'ranked';
    this.runModeReason = null;
    this.resetGlobalLeaderboardCues();

    // Rank System (Per Run)
    const initialRank = rankManager.getRankFromLevel(this.level);
    this.rankIndex = initialRank;
    this.lastRankIndex = 0; // Explicitly 0 at start to ensure consistent progression logic
    if (this.rankIndex > 0) this.lastRankIndex = this.rankIndex; // Sync if starting non-zero (unlikely but safe)
    // Rank progression follows max level reached; score is only the leaderboard value.
    this.pendingHighscore = null;

    // Diagnostics
    this.gameId = Math.random().toString(36).substring(7);
    this.diag = {
      asEv: 0,
      asPts: 0,
      asComp: 0,
      asBefore: 0,
      asAfter: 0,
      rkFromAdd: 0
    };

    this.switchScene('play');
    this.primeGlobalLeaderboardTargets();
  }

  markUnrankedRun(reason = 'debug_route') {
    this.isDebugRun = true;
    this.runMode = 'unranked';
    this.runModeReason = reason;
    this.pendingHighscore = null;
    console.log(`[Game] run marked unranked reason=${reason}`);
  }

  isScoreSubmissionAllowed() {
    return this.runMode !== 'unranked' && !this.isDebugRun;
  }

  gameOver() {
    this.state = GameState.GAME_OVER;
    this.switchScene('gameOver');
  }

  showHighscores() {
    this.switchScene('highscore');
  }

  getLeaderboardAdapter() {
    if (!this.leaderboardAdapter) {
      this.leaderboardAdapter = createLeaderboardAdapter();
    }
    return this.leaderboardAdapter;
  }

  addScore(points) {
    const applied = this.getScoreAward(points);
    this.score += applied;

    const computedRank = rankManager.getRankFromLevel(this.level);
    updateShipUnlockProgress({ score: this.score, rank: computedRank, level: this.level });

    // Always update current rank index source of truth
    this.rankIndex = computedRank;

    // Diag Update
    this.diag.asEv++;
    this.diag.asPts = Number(points) || 0;
    this.diag.asComp = computedRank;
    this.diag.asBefore = this.lastRankIndex;
    this.diag.asAfter = this.lastRankIndex;
    this.updateGlobalLeaderboardVoiceCues();
    return applied;
  }

  getScoreAward(points) {
    const base = Number(points) || 0;
    // Check both Game's scoreMultiplier (bonus core) and Player's scoreMultiplier (score_x2)
    const gameMult = Number(this.scoreMultiplier) || 1;
    const playerMult = this.scenes?.play?.player?.scoreMultiplier || 1;
    const mult = gameMult * playerMult;
    return normalizeScoreDelta(base, mult);
  }

  resetGlobalLeaderboardCues() {
    this.globalLeaderboardTargets = null;
    this.globalLeaderboardTargetPromise = null;
    this.globalLeaderboardCueState = {
      global: false,
      top3: false,
      number1: false
    };
  }

  primeGlobalLeaderboardTargets() {
    if (this.runMode === 'unranked' || this.globalLeaderboardTargetPromise) return this.globalLeaderboardTargetPromise;
    this.globalLeaderboardTargetPromise = this.getLeaderboardAdapter().getGlobalScoresForPlacement({ useCache: true })
      .then((scores) => {
        this.globalLeaderboardTargets = Array.isArray(scores) ? scores : [];
        this.updateGlobalLeaderboardVoiceCues();
        return this.globalLeaderboardTargets;
      })
      .catch((error) => {
        console.warn('[GlobalLeaderboardCue] Unable to load global targets', error);
        this.globalLeaderboardTargets = [];
        return this.globalLeaderboardTargets;
      });
    return this.globalLeaderboardTargetPromise;
  }

  updateGlobalLeaderboardVoiceCues() {
    if (this.runMode === 'unranked' || !Array.isArray(this.globalLeaderboardTargets)) return;
    const placement = analyzeGlobalLeaderboardScore(this.score, this.globalLeaderboardTargets);
    if (!placement.qualified && placement.nearGlobal && !this.globalLeaderboardCueState.global) {
      this.globalLeaderboardCueState.global = true;
      AudioManager.playVoice('mission_control_global_close', {
        cooldownMs: 42000,
        duckMs: 2100,
        duckFactor: 0.42,
        volume: 0.9
      });
    }
    if (!placement.top3 && placement.nearTop3 && !this.globalLeaderboardCueState.top3) {
      this.globalLeaderboardCueState.top3 = true;
      AudioManager.playVoice('mission_control_top3_close', {
        cooldownMs: 42000,
        duckMs: 2300,
        duckFactor: 0.38,
        volume: 0.94
      });
    }
    if (!placement.numberOne && placement.nearNumberOne && !this.globalLeaderboardCueState.number1) {
      this.globalLeaderboardCueState.number1 = true;
      AudioManager.playVoice('mission_control_number_one_close', {
        cooldownMs: 42000,
        duckMs: 2600,
        duckFactor: 0.34,
        volume: 0.98
      });
    }
  }

  activateScoreBoost(multiplier, duration) {
    if (this.currentScene && this.currentScene.scoreMultiplier !== undefined) {
      this.currentScene.scoreMultiplier = multiplier;
      this.currentScene.scoreBoostTimer = duration;
    }
    this.scoreMultiplier = multiplier;
  }

  // --- Rank System ---

  // Legacy addRankXp removed - progression rank is level based now.
  // Compatibility shim if needed by old calls, redirect to addScore if appropriate
  // or just return true/false to prevent crash, but better to update callsites.
  addRankXp(amount) {
    this.addScore(amount); // Convert XP to Score directly
    return false; // Handling rank up in addScore event now
  }

  getRankProgress() {
    return rankManager.getRankProgress(this.level, this.rankIndex);
  }

  loseLife() {
    this.lives--;
    if (this.currentScene && this.currentScene.onLifeLost) {
      this.currentScene.onLifeLost(this.lives);
    }
    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  gainLife() {
    const before = this.lives;
    const MAX_LIVES = 5;
    this.lives = Math.min(this.lives + 1, MAX_LIVES);
    const after = this.lives;
    const applied = after > before;
    console.log(`[Lives] pickup extra_life before=${before} after=${after} max=${MAX_LIVES} applied=${applied}`);

    // Notify scene if needed
    if (this.currentScene && this.currentScene.onLifeGained) {
      this.currentScene.onLifeGained(this.lives);
    }
  }

  nextLevel() {
    const prevRank = this.rankIndex;
    this.level++;
    const computedRank = rankManager.getRankFromLevel(this.level);
    this.rankIndex = computedRank;
    updateShipUnlockProgress({ score: this.score, rank: computedRank, level: this.level });
    if (computedRank > this.lastRankIndex) {
      this.lastRankIndex = computedRank;
      console.log('[RankUp]', { level: this.level, score: this.score, newRank: computedRank, prevRank });
      if (this.currentScene && typeof this.currentScene.onRankUp === 'function') {
        this.currentScene.onRankUp(computedRank);
      }
    }
    if (this.currentScene && this.currentScene.startLevel) {
      this.currentScene.startLevel();
    }
  }

  update(delta) {
    if (this.currentScene && this.currentScene.update) {
      this.currentScene.update(delta);
    }
  }

  getWidth() {
    return this.app.screen.width;
  }

  getHeight() {
    return this.app.screen.height;
  }

  // TASK 2 & 4: Rank title and texture helpers
  getRankTitle(rankIndex) {
    return rankManager.getRankTitle(rankIndex);
  }

  getRankTexture(rankIndex) {
    return rankManager.getRankTexture(rankIndex);
  }
}
