import * as PIXI from 'pixi.js';
import { GameState } from './GameState.js';
import { MenuScene } from '../scenes/MenuScene.js';
import { PlayScene } from '../scenes/PlayScene.js';
import { GameOverScene } from '../scenes/GameOverScene.js';

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

    this.scenes = {
      menu: new MenuScene(this),
      play: new PlayScene(this),
      gameOver: new GameOverScene(this),
      highscore: new HighscoreScene(this)
    };
  }

  start() {
    this.switchScene('menu');
  }

  switchScene(sceneName) {
    if (this.currentScene) {
      this.app.stage.removeChild(this.currentScene.container);
      this.currentScene.destroy();
    }

    this.currentScene = this.scenes[sceneName];
    this.app.stage.addChild(this.currentScene.container);
    this.currentScene.init();
  }

  startGame() {
    console.log('[Game] Starting new game...');
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
    this.score += Number(points) || 0;

    const prevRank = this.rankIndex;
    const computedRank = rankManager.getRankFromScore(this.score);

    // Always update current rank index source of truth
    this.rankIndex = computedRank;

    // Strict Rank Up Event Logic
    // Only fire if we have strictly exceeded the last SEEN rank index
    if (computedRank > this.lastRankIndex) {

      // Update lastRankIndex to the new high water mark
      this.lastRankIndex = computedRank;

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
}
