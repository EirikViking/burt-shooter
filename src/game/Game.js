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
    const initialRank = rankManager.getRankFromScore(this.score);
    this.rankIndex = initialRank;
    this.lastRankIndex = initialRank; // Track last rank to prevent spam
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
    this.score += points;

    // Check Rank Up - STRICT GATING to prevent spam
    const newRank = rankManager.getRankFromScore(this.score);

    if (newRank > this.rankIndex) {
      this.rankIndex = newRank;
      if (newRank > this.lastRankIndex) {
        this.lastRankIndex = newRank;
        if (this.currentScene && this.currentScene.onRankUp) {
          this.currentScene.onRankUp(newRank);
        }
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
