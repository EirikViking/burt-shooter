import * as PIXI from 'pixi.js';
import { GameState } from './GameState.js';
import { MenuScene } from '../scenes/MenuScene.js';
import { PlayScene } from '../scenes/PlayScene.js';
import { GameOverScene } from '../scenes/GameOverScene.js';
import { ShipSelectScene } from '../scenes/ShipSelectScene.js';
import { HighscoreScene } from '../scenes/HighscoreScene.js';
import { rankManager } from '../managers/RankManager.js';

export class Game {
  constructor(app) {
    this.app = app;
    this.state = GameState.MENU;
    this.currentScene = null;
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.scoreMultiplier = 1;

    this.scenes = {
      menu: new MenuScene(this),
      shipSelect: null, // Created on demand
      play: new PlayScene(this),
      gameOver: new GameOverScene(this),
      highscore: new HighscoreScene(this)
    };
    this.selectedShipId = null;
  }

  start() {
    this.switchScene('menu');
  }

  switchScene(sceneName) {
    if (this.currentScene) {
      this.app.stage.removeChild(this.currentScene.container);
      if (this.currentScene.cleanup) {
        this.currentScene.cleanup();
      }
      this.currentScene.destroy();
    }

    this.currentScene = this.scenes[sceneName];
    this.app.stage.addChild(this.currentScene.container);
    this.currentScene.init();
  }

  async showShipSelect() {
    // Create ship select scene if not exists
    if (!this.scenes.shipSelect) {
      this.scenes.shipSelect = new ShipSelectScene(this);
      await this.scenes.shipSelect.create();
    }

    // Remove current scene
    if (this.currentScene) {
      this.app.stage.removeChild(this.currentScene.container);
      if (this.currentScene.cleanup) {
        this.currentScene.cleanup();
      }
    }

    // Show ship select
    this.currentScene = this.scenes.shipSelect;
    this.app.stage.addChild(this.currentScene.container);
  }

  startGame(shipId) {
    console.log('[Game] Starting new game with ship:', shipId);
    this.selectedShipId = shipId;
    this.score = 0;
    this.level = 1;
    this.lives = 3;

    // Rank System (Per Run)
    // Rank System (Per Run)
    const initialRank = rankManager.getRankFromScore(this.score);
    this.rankIndex = initialRank;
    this.lastRankIndex = 0; // Explicitly 0 at start to ensure consistent progression logic
    if (this.rankIndex > 0) this.lastRankIndex = this.rankIndex; // Sync if starting non-zero (unlikely but safe)
    // Removed legacy rankXp, we now derive from score
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
  }

  gameOver() {
    this.state = GameState.GAME_OVER;
    this.switchScene('gameOver');
  }

  showHighscores() {
    this.switchScene('highscore');
  }

  addScore(points) {
    const base = Number(points) || 0;
    const mult = Number(this.scoreMultiplier) || 1;
    const applied = Math.round(base * mult);
    this.score += applied;

    const prevRank = this.rankIndex;
    const computedRank = rankManager.getRankFromScore(this.score);

    // Always update current rank index source of truth
    this.rankIndex = computedRank;

    // Diag Update
    this.diag.asEv++;
    this.diag.asPts = base;
    this.diag.asComp = computedRank;
    this.diag.asBefore = this.lastRankIndex;

    // Strict Rank Up Event Logic
    // Only fire if we have strictly exceeded the last SEEN rank index
    if (computedRank > this.lastRankIndex) {
      this.diag.rkFromAdd++;

      // Update lastRankIndex to the new high water mark
      this.lastRankIndex = computedRank;
      this.diag.asAfter = this.lastRankIndex;

      console.log('[RankUp]', { score: this.score, newRank: computedRank, prevRank });

      if (this.currentScene && typeof this.currentScene.onRankUp === 'function') {
        this.currentScene.onRankUp(computedRank);
      }
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

  // Legacy addRankXp removed - Rank is purely score based now.
  // Compatibility shim if needed by old calls, redirect to addScore if appropriate
  // or just return true/false to prevent crash, but better to update callsites.
  addRankXp(amount) {
    this.addScore(amount); // Convert XP to Score directly
    return false; // Handling rank up in addScore event now
  }

  getRankProgress() {
    return rankManager.getRankProgress(this.score, this.rankIndex);
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
    // PART C: Clamp lives to max of 6
    const MAX_LIVES = 6;
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
    this.level++;
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
