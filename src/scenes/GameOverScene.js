import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { API } from '../api/API.js';
import { extendGameOverTexts, getGameOverComment } from '../text/phrasePool.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { createTextLayout, createVerticalStack, clampTextWidth, getResponsiveFontSize } from '../ui/textLayout.js';
import { generateUUID } from '../utils/uuid.js';

const ENTRY_PROMPT_DESKTOP = 'TRYKK ENTER FOR Å LOGGE SCORE';
const ENTRY_PROMPT_MOBILE = 'TRYKK HER FOR Å LOGGE SCORE';
const INPUT_PROMPT = 'SKRIV NAVN OG TRYKK OK';

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
    this.layoutUnsubscribe = null;
    this.title = null;
    this.scoreText = null;
    this.levelText = null;
    this.comment = null;
    this.promptText = null;
    this.nameDisplay = null;
    this.instructions = null;
    // HTML overlay for mobile input
    this.inputOverlay = null;
    this.inputField = null;
    this.submitButton = null;
    // Frozen final values
    this.finalScore = 0;
    this.finalLevel = 0;
    this.cachedHighscores = null;
    this.isQualified = false;
    // Submission deduplication
    this.submissionId = null;
  }

  init() {
    this.container.removeChildren();
    this.removeInputOverlay();
    this.nameInput = '';
    this.state = 'prompt';
    this.caretVisible = true;

    // FREEZE final score and level immediately
    this.finalScore = Number(this.game.score) || 0;
    this.finalLevel = Number(this.game.level) || 0;

    // Generate unique submissionId for this run (reused across retries)
    this.submissionId = generateUUID();
    console.log('[GameOver] Generated submissionId:', this.submissionId);

    const { width, height } = this.game.app.screen;
    const responsiveLayout = getCurrentLayout();
    const layout = createTextLayout(width, height, responsiveLayout);

    const gameOverTexts = [
      'MONGO VANT!',
      'RØLP OVERLOAD!',
      'GRIS DOMINANS!',
      'DEILI FETTA...',
      'TILBAKE TIL MELBU!'
    ];
    const gameOverPool = extendGameOverTexts(gameOverTexts);
    const randomText = gameOverPool[Math.floor(Math.random() * gameOverPool.length)];

    const titleSize = getResponsiveFontSize(layout, 'title');
    this.title = new PIXI.Text(randomText, {
      fontFamily: 'Courier New',
      fontSize: titleSize,
      fill: '#ff0000',
      stroke: '#880000',
      strokeThickness: layout.isMobile ? 2 : 3,
      dropShadow: true,
      dropShadowColor: '#ff0000',
      dropShadowBlur: layout.isMobile ? 4 : 8
    });
    this.title.anchor.set(0.5);
    this.container.addChild(this.title);

    const scoreSize = getResponsiveFontSize(layout, 'score');
    this.scoreText = new PIXI.Text(`SCORE: ${this.finalScore}`, {
      fontFamily: 'Courier New',
      fontSize: scoreSize,
      fill: '#ffff00'
    });
    this.scoreText.anchor.set(0.5);
    this.container.addChild(this.scoreText);

    const levelSize = getResponsiveFontSize(layout, 'subtitle');
    this.levelText = new PIXI.Text(`NÅDDE LEVEL: ${this.finalLevel}`, {
      fontFamily: 'Courier New',
      fontSize: levelSize,
      fill: '#ffffff'
    });
    this.levelText.anchor.set(0.5);
    this.container.addChild(this.levelText);

    const bodySize = getResponsiveFontSize(layout, 'body');
    this.comment = new PIXI.Text(getGameOverComment(this.finalScore, this.finalLevel), {
      fontFamily: 'Courier New',
      fontSize: bodySize,
      fill: '#aaaaaa',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.9, layout),
      lineHeight: Math.round(bodySize * 1.4)
    });
    this.comment.anchor.set(0.5);
    this.container.addChild(this.comment);

    const promptSize = layout.isMobile ? 18 : 20;
    const promptText = layout.isMobile ? ENTRY_PROMPT_MOBILE : ENTRY_PROMPT_DESKTOP;
    this.promptText = new PIXI.Text(promptText, {
      fontFamily: 'Courier New',
      fontSize: promptSize,
      fill: '#00ffff',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.85, layout)
    });
    this.promptText.anchor.set(0.5);
    this.promptText.eventMode = 'static';
    this.promptText.cursor = 'pointer';
    this.promptPointer = () => this.enterInputMode();
    this.promptText.on('pointerdown', this.promptPointer);
    this.container.addChild(this.promptText);

    const nameSize = layout.isMobile ? 22 : 26;
    this.nameDisplay = new PIXI.Text('', {
      fontFamily: 'Courier New',
      fontSize: nameSize,
      fill: '#ffffff'
    });
    this.nameDisplay.anchor.set(0.5);
    this.nameDisplay.visible = false;
    this.container.addChild(this.nameDisplay);

    const smallSize = getResponsiveFontSize(layout, 'small');
    this.instructions = new PIXI.Text('ESC: Tilbake til meny', {
      fontFamily: 'Courier New',
      fontSize: smallSize,
      fill: '#666666'
    });
    this.instructions.anchor.set(0.5);
    this.container.addChild(this.instructions);

    this.layoutUnsubscribe?.();
    this.layoutUnsubscribe = addResponsiveListener(() => this.layoutScreen());
    this.layoutScreen();

    this.updateNameDisplay();
    this.setupKeyboard();

    AudioManager.playSfx('levelComplete');
    AudioManager.playVoice('mission_complete'); // Best fallback for now
    AudioManager.playMusicContext('scoreboard');

    // Fetch scores for qualification check
    API.getHighscores().then(scores => {
      this.cachedHighscores = scores || [];
      // Sort desc
      this.cachedHighscores.sort((a, b) => b.score - a.score);

      // Determine qualification (Top 10)
      if (this.cachedHighscores.length < 10) {
        this.isQualified = true;
      } else {
        const tenth = this.cachedHighscores[9].score; // 10th place
        this.isQualified = this.finalScore > tenth;
      }
      console.log(`[GameOver] Qualification Check: Score ${this.finalScore} vs 10th ${this.cachedHighscores[9]?.score || 0} -> ${this.isQualified}`);

      // Update prompt visibility based on qualification
      if (!this.isQualified && this.promptText) {
        this.promptText.visible = false;
        // Show "not qualified" message
        const { width, height } = this.game.app.screen;
        const notQualifiedMsg = new PIXI.Text('IKKE TOPP 10 - PRØV IGJEN!', {
          fontFamily: 'Courier New',
          fontSize: 24,
          fill: '#888888',
          align: 'center'
        });
        notQualifiedMsg.anchor.set(0.5);
        notQualifiedMsg.x = width / 2;
        notQualifiedMsg.y = this.promptText.y; // Same position as prompt
        this.container.addChild(notQualifiedMsg);
      }
    }).catch(e => {
      console.warn('Failed to pre-fetch scores', e);
      this.isQualified = false; // Default to NOT prompting on fetch failure

      // Hide prompt on fetch failure
      if (this.promptText) {
        this.promptText.visible = false;
      }
    });
  }

  layoutScreen() {
    const { width, height } = this.game.app.screen;
    const responsiveLayout = getCurrentLayout();
    const layout = createTextLayout(width, height, responsiveLayout);
    const safeMargin = responsiveLayout.safeArea;

    // Update font sizes
    const titleSize = getResponsiveFontSize(layout, 'title');
    const scoreSize = getResponsiveFontSize(layout, 'score');
    const levelSize = getResponsiveFontSize(layout, 'subtitle');
    const bodySize = getResponsiveFontSize(layout, 'body');
    const promptSize = layout.isMobile ? 18 : 20;
    const nameSize = layout.isMobile ? 22 : 26;
    const smallSize = getResponsiveFontSize(layout, 'small');

    this.title.style.fontSize = titleSize;
    this.title.style.strokeThickness = layout.isMobile ? 2 : 3;
    this.scoreText.style.fontSize = scoreSize;
    this.levelText.style.fontSize = levelSize;
    this.comment.style.fontSize = bodySize;
    this.comment.style.lineHeight = Math.round(bodySize * 1.4);
    this.comment.style.wordWrapWidth = clampTextWidth(width * 0.9, layout);
    this.promptText.style.fontSize = promptSize;
    this.promptText.style.wordWrapWidth = clampTextWidth(width * 0.85, layout);
    this.nameDisplay.style.fontSize = nameSize;
    this.instructions.style.fontSize = smallSize;

    // Calculate content height for centering
    const spacing = layout.isMobile ? 8 : 14;
    const sectionGap = layout.isMobile ? 16 : 24;

    // Estimate heights
    const titleHeight = titleSize * 1.2;
    const scoreHeight = scoreSize * 1.2;
    const levelHeight = levelSize * 1.2;
    const commentHeight = bodySize * 2 * 1.4; // ~2 lines
    const promptHeight = promptSize * 1.2;
    const nameHeight = nameSize * 1.2;

    const totalHeight = titleHeight + scoreHeight + levelHeight + commentHeight + promptHeight + nameHeight + spacing * 5 + sectionGap * 2;

    // Calculate starting Y for vertical centering with safe margin
    const footerSpace = layout.isMobile ? 40 : 50;
    const availableHeight = height - footerSpace - safeMargin.top;
    const startY = Math.max(safeMargin.top, safeMargin.top + (availableHeight - totalHeight) / 2 * (layout.isMobile ? 0.5 : 0.7));

    const stack = createVerticalStack(layout, { startY, spacing });

    this.title.x = width / 2;
    this.title.y = stack.placeElement(this.title, spacing);

    this.scoreText.x = width / 2;
    this.scoreText.y = stack.placeElement(this.scoreText, spacing * 0.5);

    this.levelText.x = width / 2;
    this.levelText.y = stack.placeElement(this.levelText, sectionGap);

    this.comment.x = width / 2;
    this.comment.y = stack.placeText(this.comment, sectionGap);

    this.promptText.x = width / 2;
    this.promptText.y = stack.placeElement(this.promptText, spacing);

    this.nameDisplay.x = width / 2;
    this.nameDisplay.y = stack.getCurrentY();

    this.instructions.x = width / 2;
    this.instructions.y = height - safeMargin.bottom - (layout.isMobile ? 16 : 20);
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
    if (this.state === 'input' || this.state === 'submitting' || this.state === 'rejected') return;

    // STRICT Qualification Rule: Only allow name entry if EXPLICITLY qualified for top 10
    // If cachedHighscores is null (fetch failed/pending), default to NOT qualified
    // If cachedHighscores exists but isQualified is false, reject
    // Only proceed if isQualified === true

    if (!this.isQualified) {
      console.log('[GameOver] Player not qualified for Top 10. Blocking submission.');

      AudioManager.playVoice('game_over');

      // Show feedback
      const { width, height } = this.game.app.screen;
      const msg = new PIXI.Text('IKKE TOPP 10!\nDU MÅ BLI BEDRE!', {
        fontFamily: 'Courier New', fontSize: 32, fill: '#ff0000', align: 'center', stroke: '#ffffff', strokeThickness: 2
      });
      msg.anchor.set(0.5);
      msg.x = width / 2;
      msg.y = height / 2;
      this.container.addChild(msg);

      // Hide prompt
      if (this.promptText) this.promptText.visible = false;
      this.state = 'rejected';

      setTimeout(() => {
        this.game.showHighscores();
      }, 2000);
      return;
    }

    // Only reach here if isQualified === true
    console.log('[GameOver] Player qualified for Top 10. Allowing name entry.');

    this.state = 'input';
    this.nameInput = '';
    this.caretVisible = true;
    this.submitRetries = 0;

    const layout = getCurrentLayout();

    if (layout.isMobile) {
      // Show HTML overlay for mobile
      this.showInputOverlay();
      this.promptText.visible = false;
      this.nameDisplay.visible = false;
    } else {
      // Desktop: use PIXI text display with hidden input
      this.updatePromptMessage(INPUT_PROMPT);
      this.nameDisplay.visible = true;
      this.ensureHiddenInput();
      if (this.hiddenInput) {
        this.hiddenInput.value = '';
        this.hiddenInput.focus();
      }
      this.startCaretBlink();
      this.updateNameDisplay();
    }
  }

  exitInputMode() {
    if (this.state !== 'input') return;
    this.state = 'prompt';
    this.stopCaretBlink();
    this.hideHiddenInput();
    this.removeInputOverlay();

    const layout = getCurrentLayout();
    const promptText = layout.isMobile ? ENTRY_PROMPT_MOBILE : ENTRY_PROMPT_DESKTOP;
    this.updatePromptMessage(promptText);
    this.promptText.visible = true;
    this.nameDisplay.visible = false;
    this.updateNameDisplay();
  }

  updatePromptMessage(text) {
    if (this.promptText) {
      this.promptText.text = text;
    }
  }

  showInputOverlay() {
    if (this.inputOverlay) return;

    const { width, height } = this.game.app.screen;

    // Create overlay container
    this.inputOverlay = document.createElement('div');
    this.inputOverlay.id = 'name-input-overlay';
    this.inputOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: rgba(0, 0, 0, 0.85);
      z-index: 10000;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Label
    const label = document.createElement('div');
    label.textContent = 'SKRIV DITT NAVN';
    label.style.cssText = `
      font-family: 'Courier New', monospace;
      font-size: 20px;
      color: #00ffff;
      margin-bottom: 16px;
      text-align: center;
    `;
    this.inputOverlay.appendChild(label);

    // Input field
    this.inputField = document.createElement('input');
    this.inputField.type = 'text';
    this.inputField.maxLength = 10;
    this.inputField.autocapitalize = 'characters';
    this.inputField.autocomplete = 'off';
    this.inputField.spellcheck = false;
    this.inputField.placeholder = 'NAVN';
    this.inputField.style.cssText = `
      font-family: 'Courier New', monospace;
      font-size: 28px;
      color: #ffffff;
      background: #111111;
      border: 3px solid #00ffff;
      border-radius: 8px;
      padding: 14px 20px;
      width: 280px;
      max-width: 90%;
      text-align: center;
      text-transform: uppercase;
      outline: none;
      box-sizing: border-box;
    `;
    this.inputField.addEventListener('input', (e) => {
      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
      e.target.value = value.slice(0, 10);
      this.nameInput = e.target.value;
    });
    this.inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.nameInput.length > 0) {
        e.preventDefault();
        this.submitScore();
      }
    });
    this.inputOverlay.appendChild(this.inputField);

    // Button container
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      display: flex;
      gap: 12px;
      margin-top: 20px;
    `;

    // Submit button
    this.submitButton = document.createElement('button');
    this.submitButton.textContent = 'OK';
    this.submitButton.style.cssText = `
      font-family: 'Courier New', monospace;
      font-size: 22px;
      color: #000000;
      background: #00ffff;
      border: none;
      border-radius: 8px;
      padding: 14px 40px;
      cursor: pointer;
      font-weight: bold;
      min-width: 120px;
    `;
    this.submitButton.addEventListener('click', () => {
      if (this.nameInput.length > 0) {
        this.submitScore();
      }
    });
    btnContainer.appendChild(this.submitButton);

    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'AVBRYT';
    cancelButton.style.cssText = `
      font-family: 'Courier New', monospace;
      font-size: 18px;
      color: #888888;
      background: #333333;
      border: 2px solid #666666;
      border-radius: 8px;
      padding: 14px 20px;
      cursor: pointer;
    `;
    cancelButton.addEventListener('click', () => {
      this.exitInputMode();
    });
    btnContainer.appendChild(cancelButton);

    this.inputOverlay.appendChild(btnContainer);

    document.body.appendChild(this.inputOverlay);

    // Focus the input field after a short delay (for mobile keyboard)
    setTimeout(() => {
      if (this.inputField) {
        this.inputField.focus();
      }
    }, 100);
  }

  removeInputOverlay() {
    if (this.inputOverlay && this.inputOverlay.parentNode) {
      this.inputOverlay.parentNode.removeChild(this.inputOverlay);
    }
    this.inputOverlay = null;
    this.inputField = null;
    this.submitButton = null;
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
      this.nameDisplay.visible = true;
    } else if (this.state === 'submitting') {
      this.nameDisplay.text = 'SENDER...';
      this.nameDisplay.visible = true;
    } else {
      this.nameDisplay.visible = false;
    }
  }

  async submitScore() {
    if (this.state !== 'input' || this.nameInput.length === 0) {
      return;
    }
    this.state = 'submitting';
    this.stopCaretBlink();
    this.hideHiddenInput();

    // Update UI to show submitting state
    if (this.inputOverlay) {
      if (this.submitButton) {
        this.submitButton.textContent = 'SENDER...';
        this.submitButton.disabled = true;
      }
    } else {
      this.updatePromptMessage('SENDER...');
      this.updateNameDisplay();
    }

    try {
      console.log('[GameOverScene] Submitting score...', {
        name: this.nameInput,
        score: this.finalScore,
        level: this.finalLevel,
        rank: this.game.rankIndex
      });

      // Timeout wrapper (5s)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );

      // Attempt API call with submissionId for deduplication
      await Promise.race([
        API.submitScore(this.nameInput, this.finalScore, this.finalLevel, this.game.rankIndex, this.submissionId),
        timeoutPromise
      ]);

      console.log('[GameOverScene] Submit success.');
      this.removeInputOverlay();
      this.game.showHighscores();

    } catch (error) {
      console.warn('[GameOverScene] Submit failed:', error.message);

      this.submitRetries = (this.submitRetries || 0) + 1;

      if (this.submitRetries >= 2) {
        // Fallback: Offline Save
        console.log('[GameOverScene] Falling back to offline display.');
        this.game.pendingHighscore = {
          name: this.nameInput,
          score: this.finalScore,
          level: this.finalLevel,
          rankIndex: this.game.rankIndex || 0,
          pending: true
        };
        this.removeInputOverlay();
        this.game.showHighscores();
        return;
      }

      // Retry Mode
      this.state = 'prompt'; // Or stay in input? Let's stay in input but show error.
      this.state = 'input'; // User can edit/retry
      this.startCaretBlink();
      this.ensureHiddenInput(); // Refocus

      if (this.inputOverlay) {
        if (this.submitButton) {
          this.submitButton.textContent = 'FEIL! PRØV IGJEN';
          this.submitButton.style.background = '#ff4444';
          this.submitButton.disabled = false;
        }
        setTimeout(() => {
          if (this.submitButton) {
            this.submitButton.textContent = 'OK';
            this.submitButton.style.background = '#00ffff';
          }
        }, 2000);
      } else {
        this.updatePromptMessage('FEIL! PRØV IGJEN');
        if (this.nameDisplay) {
          this.nameDisplay.text = 'FEIL! PRØV IGJEN';
        }
        setTimeout(() => {
          if (this.state === 'input') this.updateNameDisplay();
        }, 2000);
      }
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
    this.removeInputOverlay();
    this.stopCaretBlink();
    this.layoutUnsubscribe?.();
    this.layoutUnsubscribe = null;
  }
}
