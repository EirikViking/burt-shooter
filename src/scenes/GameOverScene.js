import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { API } from '../api/API.js';

export class GameOverScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.nameInput = '';
    this.submitting = false;
  }

  init() {
    this.container.removeChildren();
    this.nameInput = '';
    this.submitting = false;

    const { width, height } = this.game.app.screen;

    // Game Over title
    const gameOverTexts = [
      'MONGO VANT!',
      'R\u00d8LP OVERLOAD!',
      'GRIS DOMINANS!',
      'DEILI FETTA...',
      'TILBAKE TIL MELBU!'
    ];
    const randomText = gameOverTexts[Math.floor(Math.random() * gameOverTexts.length)];

    const title = new PIXI.Text(randomText, {
      fontFamily: 'Courier New',
      fontSize: 64,
      fill: '#ff0000',
      stroke: '#880000',
      strokeThickness: 4,
      dropShadow: true,
      dropShadowColor: '#ff0000',
      dropShadowBlur: 10
    });
    title.anchor.set(0.5);
    title.x = width / 2;
    title.y = height / 4;
    this.container.addChild(title);

    // Score
    const scoreText = new PIXI.Text(`SCORE: ${this.game.score}`, {
      fontFamily: 'Courier New',
      fontSize: 36,
      fill: '#ffff00'
    });
    scoreText.anchor.set(0.5);
    scoreText.x = width / 2;
    scoreText.y = height / 3;
    this.container.addChild(scoreText);

    // Level reached
    const levelText = new PIXI.Text(`N\u00c5DDE LEVEL: ${this.game.level}`, {
      fontFamily: 'Courier New',
      fontSize: 24,
      fill: '#ffffff'
    });
    levelText.anchor.set(0.5);
    levelText.x = width / 2;
    levelText.y = height / 3 + 50;
    this.container.addChild(levelText);

    // Name input prompt
    const prompt = new PIXI.Text('SKRIV NAVN (TRYKK ENTER):', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#00ffff'
    });
    prompt.anchor.set(0.5);
    prompt.x = width / 2;
    prompt.y = height / 2;
    this.container.addChild(prompt);

    // Name display
    this.nameDisplay = new PIXI.Text('_', {
      fontFamily: 'Courier New',
      fontSize: 28,
      fill: '#ffffff'
    });
    this.nameDisplay.anchor.set(0.5);
    this.nameDisplay.x = width / 2;
    this.nameDisplay.y = height / 2 + 40;
    this.container.addChild(this.nameDisplay);

    // Instructions
    const instructions = new PIXI.Text('ESC: Tilbake til meny', {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: '#888888'
    });
    instructions.anchor.set(0.5);
    instructions.x = width / 2;
    instructions.y = height - 40;
    this.container.addChild(instructions);

    // Setup keyboard input
    this.setupKeyboard();

    AudioManager.play('gameOver');
  }

  setupKeyboard() {
    this.keyHandler = (e) => {
      if (this.submitting) return;

      const isSubmitKey = e.key === 'Enter' || e.key === 'Return' || e.code === 'NumpadEnter';
      if (isSubmitKey && this.nameInput.length > 0) {
        e.preventDefault();
        this.submitScore();
        return;
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        this.nameInput = this.nameInput.slice(0, -1);
        this.updateNameDisplay();
      } else if (e.key === 'Escape') {
        this.game.switchScene('menu');
      } else if (e.key.length === 1 && this.nameInput.length < 10) {
        e.preventDefault();
        this.nameInput += e.key.toUpperCase();
        this.updateNameDisplay();
      }
    };

    window.addEventListener('keydown', this.keyHandler);
  }

  updateNameDisplay() {
    this.nameDisplay.text = this.nameInput || '_';
  }

  async submitScore() {
    this.submitting = true;
    this.nameDisplay.text = 'SENDER...';

    try {
      await API.submitScore(this.nameInput, this.game.score, this.game.level);
      this.game.showHighscores();
    } catch (error) {
      console.error('Failed to submit score:', error);
      this.nameDisplay.text = 'FEIL! TRYKK ESC';
      this.submitting = false;
    }
  }

  destroy() {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }
  }
}
