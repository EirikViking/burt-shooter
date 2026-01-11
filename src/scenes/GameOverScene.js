import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { API } from '../api/API.js';
import { extendGameOverTexts, getGameOverComment } from '../text/phrasePool.js';

const ENTRY_PROMPT = 'PRESS ENTER TO LOG YOUR SCORE';
const INPUT_PROMPT = 'TYPE YOUR NAME THEN HIT ENTER';

export class GameOverScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.nameInput = '';
    this.state = 'prompt';
    this.hiddenInput = null;
    this.boundHiddenInput = null;
    this.keyHandler = null;
    this.caretInterval = null;
    this.caretVisible = true;
    this.promptPointer = null;
  }

  init() {
    this.container.removeChildren();
    this.nameInput = '';
    this.state = 'prompt';
    this.caretVisible = true;

    const { width, height } = this.game.app.screen;

    const gameOverTexts = [
      'MONGO VANT!',
      'RØLP OVERLOAD!',
      'GRIS DOMINANS!',
      'DEILI FETTA...',
      'TILBAKE TIL MELBU!'
    ];
    const gameOverPool = extendGameOverTexts(gameOverTexts);
    const randomText = gameOverPool[Math.floor(Math.random() * gameOverPool.length)];

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

    const scoreText = new PIXI.Text(`SCORE: ${this.game.score}`, {
      fontFamily: 'Courier New',
      fontSize: 36,
      fill: '#ffff00'
    });
    scoreText.anchor.set(0.5);
    scoreText.x = width / 2;
    scoreText.y = height / 3;
    this.container.addChild(scoreText);

    const levelText = new PIXI.Text(`NÅDDE LEVEL: ${this.game.level}`, {
      fontFamily: 'Courier New',
      fontSize: 24,
      fill: '#ffffff'
    });
    levelText.anchor.set(0.5);
    levelText.x = width / 2;
    levelText.y = height / 3 + 50;
    this.container.addChild(levelText);

    const comment = new PIXI.Text(getGameOverComment(this.game.score, this.game.level), {
      fontFamily: 'Courier New',
      fontSize: 18,
      fill: '#ffffff',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: width * 0.9,
      lineHeight: 22
    });
    comment.anchor.set(0.5);
    comment.x = width / 2;
    comment.y = height / 3 + 90;
    if (comment.width > width * 0.9) {
      comment.scale.set((width * 0.9) / comment.width);
    }
    this.container.addChild(comment);

    this.promptText = new PIXI.Text(ENTRY_PROMPT, {
      fontFamily: 'Courier New',
      fontSize: 22,
      fill: '#00ffff',
      align: 'center'
    });
    this.promptText.anchor.set(0.5);
    this.promptText.x = width / 2;
    this.promptText.y = height / 2;
    this.promptText.interactive = true;
    this.promptText.buttonMode = true;
    this.promptPointer = () => this.enterInputMode();
    this.promptText.on('pointerdown', this.promptPointer);
    this.container.addChild(this.promptText);

    this.nameDisplay = new PIXI.Text('NAME: _', {
      fontFamily: 'Courier New',
      fontSize: 28,
      fill: '#ffffff'
    });
    this.nameDisplay.anchor.set(0.5);
    this.nameDisplay.x = width / 2;
    this.nameDisplay.y = height / 2 + 50;
    this.container.addChild(this.nameDisplay);

    const instructions = new PIXI.Text('ESC: Tilbake til meny', {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: '#888888'
    });
    instructions.anchor.set(0.5);
    instructions.x = width / 2;
    instructions.y = height - 40;
    this.container.addChild(instructions);

    this.updateNameDisplay();
    this.setupKeyboard();

    AudioManager.play('gameOver');
  }

  setupKeyboard() {
    this.keyHandler = (e) => {
      if (this.state === 'submitting') {
        return;
      }

      const isSubmitKey = e.key === 'Enter' || e.key === 'Return' || e.code === 'NumpadEnter';
      const isEscape = e.key === 'Escape';

      if (isEscape) {
        e.preventDefault();
        if (this.state === 'input') {
          this.exitInputMode();
        } else {
          this.game.switchScene('menu');
        }
        return;
      }

      if (this.state === 'prompt') {
        if (isSubmitKey) {
          e.preventDefault();
          this.enterInputMode();
        }
        return;
      }

      if (this.state === 'input') {
        if (isSubmitKey && this.nameInput.length > 0) {
          e.preventDefault();
          this.submitScore();
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          this.nameInput = this.nameInput.slice(0, -1);
          this.syncHiddenInput();
          this.updateNameDisplay();
          return;
        }
        const char = e.key.toUpperCase();
        if (/^[A-Z0-9 ]$/.test(char) && this.nameInput.length < 10) {
          e.preventDefault();
          this.nameInput += char;
          this.syncHiddenInput();
          this.updateNameDisplay();
        }
      }
    };

    window.addEventListener('keydown', this.keyHandler);
  }

  enterInputMode() {
    if (this.state === 'input' || this.state === 'submitting') return;
    this.state = 'input';
    this.nameInput = '';
    this.caretVisible = true;
    this.updatePromptMessage(INPUT_PROMPT);
    this.ensureHiddenInput();
    if (this.hiddenInput) {
      this.hiddenInput.value = '';
      this.hiddenInput.focus();
    }
    this.startCaretBlink();
    this.updateNameDisplay();
  }

  exitInputMode() {
    if (this.state !== 'input') return;
    this.state = 'prompt';
    this.stopCaretBlink();
    this.hideHiddenInput();
    this.updatePromptMessage(ENTRY_PROMPT);
    this.updateNameDisplay();
  }

  updatePromptMessage(text) {
    if (this.promptText) {
      this.promptText.text = text;
    }
  }

  ensureHiddenInput() {
    if (this.hiddenInput) return this.hiddenInput;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 10;
    input.autocapitalize = 'characters';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.style.position = 'absolute';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    input.style.zIndex = '-1';
    input.style.left = '0';
    input.style.top = '0';
    input.style.width = '1px';
    input.style.height = '1px';
    this.boundHiddenInput = this.boundHiddenInput || this.handleHiddenInput.bind(this);
    input.addEventListener('input', this.boundHiddenInput);
    document.body.appendChild(input);
    this.hiddenInput = input;
    return input;
  }

  handleHiddenInput(event) {
    if (!event.target) return;
    const value = event.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    this.nameInput = value.slice(0, 10);
    event.target.value = this.nameInput;
    this.caretVisible = true;
    this.updateNameDisplay();
  }

  syncHiddenInput() {
    if (this.hiddenInput) {
      this.hiddenInput.value = this.nameInput;
    }
  }

  hideHiddenInput() {
    if (this.hiddenInput) {
      this.hiddenInput.blur();
    }
  }

  startCaretBlink() {
    this.stopCaretBlink();
    this.caretInterval = setInterval(() => {
      this.caretVisible = !this.caretVisible;
      this.updateNameDisplay();
    }, 500);
  }

  stopCaretBlink() {
    if (this.caretInterval) {
      clearInterval(this.caretInterval);
      this.caretInterval = null;
    }
    this.caretVisible = true;
  }

  updateNameDisplay() {
    if (!this.nameDisplay) return;
    if (this.state === 'input') {
      const caret = this.caretVisible ? '|' : '';
      this.nameDisplay.text = `NAME: ${this.nameInput}${caret}`;
    } else if (this.state === 'submitting') {
      this.nameDisplay.text = 'SENDER...';
    } else {
      this.nameDisplay.text = this.nameInput ? `NAME: ${this.nameInput}` : 'NAME: _';
    }
  }

  async submitScore() {
    if (this.state !== 'input' || this.nameInput.length === 0) {
      return;
    }
    this.state = 'submitting';
    this.stopCaretBlink();
    this.hideHiddenInput();
    this.updatePromptMessage('SENDING...');
    this.updateNameDisplay();

    try {
      await API.submitScore(this.nameInput, this.game.score, this.game.level);
      this.game.showHighscores();
    } catch (error) {
      console.error('Failed to submit score:', error);
      this.state = 'prompt';
      this.updatePromptMessage('FEIL! TRYKK ESC');
      if (this.nameDisplay) {
        this.nameDisplay.text = 'FEIL! TRYKK ESC';
      }
      this.nameInput = '';
    }
  }

  destroy() {
    if (this.promptText && this.promptPointer) {
      this.promptText.off('pointerdown', this.promptPointer);
      this.promptPointer = null;
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    if (this.hiddenInput) {
      if (this.boundHiddenInput) {
        this.hiddenInput.removeEventListener('input', this.boundHiddenInput);
      }
      if (this.hiddenInput.parentNode) {
        this.hiddenInput.parentNode.removeChild(this.hiddenInput);
      }
      this.hiddenInput = null;
    }
    this.stopCaretBlink();
  }
}
