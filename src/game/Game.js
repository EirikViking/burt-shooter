import * as PIXI from 'pixi.js';
import { GameState } from './GameState.js';
import { MenuScene } from '../scenes/MenuScene.js';
import { PlayScene } from '../scenes/PlayScene.js';
import { GameOverScene } from '../scenes/GameOverScene.js';
import { HighscoreScene } from '../scenes/HighscoreScene.js';

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
    this.rankIndex = 0;
    this.rankXp = 0;
    this.rankNextForLevel = 150; // Base XP needed for first rank up
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
  }

  activateScoreBoost(multiplier, duration) {
    if (this.currentScene && this.currentScene.scoreMultiplier !== undefined) {
      this.currentScene.scoreMultiplier = multiplier;
      this.currentScene.scoreBoostTimer = duration;
    }
  }

  // --- Rank System ---
  addRankXp(amount) {
    if (this.rankIndex >= 77) return false; // Max rank

    this.rankXp += amount;
    let leveledUp = false;

    while (this.rankXp >= this.rankNextForLevel && this.rankIndex < 77) {
      this.rankXp -= this.rankNextForLevel;
      this.rankIndex++;
      leveledUp = true;
      // Curve: Increase requirement by 10% each rank
      this.rankNextForLevel = Math.floor(this.rankNextForLevel * 1.15);
    }

    return leveledUp;
  }

  getRankProgress() {
    if (this.rankIndex >= 77) return 1.0;
    return Math.min(1, Math.max(0, this.rankXp / this.rankNextForLevel));
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
