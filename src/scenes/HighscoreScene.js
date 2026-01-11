import * as PIXI from 'pixi.js';
import { API } from '../api/API.js';
import { getHighscoreComment } from '../text/phrasePool.js';
import { addResponsiveListener } from '../ui/responsiveLayout.js';

const EMPTY_MESSAGE = 'Ingen har spilt ennå!\nVær den første fra Melbu!';

export class HighscoreScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.highscores = [];
    this.rowsContainer = new PIXI.Container();
    this.layoutInfo = null;
    this.layoutUnsubscribe = null;
    this.title = null;
    this.subtitle = null;
    this.commentText = null;
    this.loadingText = null;
    this.backBtn = null;
  }

  async init() {
    this.container.removeChildren();
    this.highscores = [];
    this.layoutUnsubscribe?.();
    this.layoutUnsubscribe = addResponsiveListener(() => this.layoutHighscore());

    const { width, height } = this.game.app.screen;

    this.title = new PIXI.Text('HIGHSCORES', {
      fontFamily: 'Courier New',
      fontSize: 48,
      fill: '#ffff00',
      stroke: '#ff8800',
      strokeThickness: 3
    });
    this.title.anchor.set(0.5);
    this.container.addChild(this.title);

    this.subtitle = new PIXI.Text('Stokmarknes sine beste', {
      fontFamily: 'Courier New',
      fontSize: 18,
      fill: '#00ffff'
    });
    this.subtitle.anchor.set(0.5);
    this.container.addChild(this.subtitle);

    this.commentText = new PIXI.Text('', {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: '#ffffff',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: width * 0.9
    });
    this.commentText.anchor.set(0.5);
    this.container.addChild(this.commentText);

    this.rowsContainer = new PIXI.Container();
    this.container.addChild(this.rowsContainer);

    this.loadingText = new PIXI.Text('Laster...', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#ffffff'
    });
    this.loadingText.anchor.set(0.5);
    this.container.addChild(this.loadingText);

    this.backBtn = this.createButton('TILBAKE', width / 2, height - 60);
    this.backBtn.on('pointerdown', () => {
      this.game.switchScene('menu');
    });
    this.container.addChild(this.backBtn);

    this.layoutHighscore();

    try {
      this.highscores = await API.getHighscores();
      if (this.loadingText && this.loadingText.parent) {
        this.container.removeChild(this.loadingText);
        this.loadingText = null;
      }
      this.displayHighscores();
    } catch (error) {
      if (this.loadingText) {
        this.loadingText.text = 'Kunne ikke laste scores!\nSjekk at serveren kjører.';
      }
      console.error('Failed to load highscores:', error);
    }
  }

  layoutHighscore() {
    const { width, height } = this.game.app.screen;
    const padding = Math.max(20, width * 0.08);
    const rowHeight = Math.max(30, height * 0.045);
    const titleY = padding;
    const subtitleY = titleY + rowHeight * 0.9;
    const headerY = subtitleY + rowHeight;
    const tableStartY = headerY + rowHeight * 0.9;
    const maxRows = Math.max(
      4,
      Math.min(12, Math.floor((height - tableStartY - padding - rowHeight) / rowHeight))
    );
    const columns = {
      rank: padding,
      name: padding + width * 0.1,
      score: width - padding - 140,
      level: width - padding
    };

    this.layoutInfo = { width, height, padding, rowHeight, titleY, subtitleY, headerY, tableStartY, columns, maxRows };

    this.title.x = width / 2;
    this.title.y = titleY;
    this.subtitle.x = width / 2;
    this.subtitle.y = subtitleY;
    this.commentText.x = width / 2;
    this.commentText.y = subtitleY + rowHeight * 0.6;
    this.commentText.style.wordWrapWidth = width * 0.9;

    if (this.loadingText) {
      this.loadingText.x = width / 2;
      this.loadingText.y = height / 2;
    }

    if (this.backBtn) {
      this.backBtn.x = width / 2;
      this.backBtn.y = height - 60;
    }

    this.renderHighscoreRows();
  }

  displayHighscores() {
    this.commentText.text = getHighscoreComment(this.highscores.length > 0);
    this.layoutHighscore();
  }

  renderHighscoreRows() {
    if (!this.layoutInfo) return;
    const { rowHeight, headerY, tableStartY, columns, maxRows, width } = this.layoutInfo;

    this.rowsContainer.removeChildren();

    const headerStyle = {
      fontFamily: 'Courier New',
      fontSize: Math.max(16, Math.floor(rowHeight * 0.6)),
      fill: '#888888'
    };
    const headerEntries = [
      { text: 'RANK', x: columns.rank },
      { text: 'NAVN', x: columns.name },
      { text: 'SCORE', x: columns.score },
      { text: 'LEVEL', x: columns.level }
    ];
    headerEntries.forEach((entry) => {
      const text = new PIXI.Text(entry.text, headerStyle);
      text.x = entry.x;
      text.y = headerY;
      this.rowsContainer.addChild(text);
    });

    if ((!this.highscores || this.highscores.length === 0) && this.loadingText) {
      return;
    }

    if (!this.highscores || this.highscores.length === 0) {
      const empty = new PIXI.Text(EMPTY_MESSAGE, {
        fontFamily: 'Courier New',
        fontSize: Math.max(16, Math.floor(rowHeight * 0.7)),
        fill: '#ffffff',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: width * 0.85,
        lineHeight: rowHeight * 0.9
      });
      empty.anchor.set(0.5, 0);
      empty.x = width / 2;
      empty.y = tableStartY;
      this.rowsContainer.addChild(empty);
      return;
    }

    const rowStyle = {
      fontFamily: 'Courier New',
      fontSize: Math.max(18, Math.floor(rowHeight * 0.65)),
      fill: '#ffffff'
    };
    const displayed = this.highscores.slice(0, maxRows);
    displayed.forEach((score, index) => {
      const rankText = new PIXI.Text((index + 1).toString().padStart(2, '0'), rowStyle);
      const nameColWidth = columns.score - columns.name - 20;
      const maxChars = Math.max(8, Math.floor(nameColWidth / 10));
      const trimmedName = score.name.length > maxChars ? `${score.name.slice(0, maxChars - 1)}…` : score.name;
      const nameText = new PIXI.Text(trimmedName, rowStyle);
      const scoreText = new PIXI.Text(score.score.toString().padStart(6, '0'), {
        ...rowStyle,
        fill: index === 0 ? '#ffff00' : index === 1 ? '#aaaaaa' : index === 2 ? '#ff8844' : '#00ffff'
      });
      const levelText = new PIXI.Text(score.level.toString(), rowStyle);
      levelText.anchor.set(1, 0);
      const y = tableStartY + index * rowHeight;
      rankText.x = columns.rank;
      rankText.y = y;
      nameText.x = columns.name;
      nameText.y = y;
      scoreText.x = columns.score;
      scoreText.y = y;
      levelText.x = columns.level;
      levelText.y = y;
      this.rowsContainer.addChild(rankText, nameText, scoreText, levelText);
    });

    if (this.highscores.length > maxRows) {
      const more = new PIXI.Text('...', {
        fontFamily: 'Courier New',
        fontSize: Math.max(20, Math.floor(rowHeight * 0.7)),
        fill: '#00ffff'
      });
      more.x = columns.name;
      more.y = tableStartY + maxRows * rowHeight;
      this.rowsContainer.addChild(more);
    }
  }

  createButton(text, x, y) {
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.rect(-80, -20, 160, 40);
    bg.fill({ color: 0x0088ff, alpha: 0.3 });
    bg.stroke({ color: 0x00ffff, width: 2 });
    container.addChild(bg);

    const label = new PIXI.Text(text, {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: '#00ffff'
    });
    label.anchor.set(0.5);
    container.addChild(label);

    container.on('pointerover', () => {
      bg.clear();
      bg.rect(-80, -20, 160, 40);
      bg.fill({ color: 0x00ffff, alpha: 0.5 });
      bg.stroke({ color: 0x00ffff, width: 2 });
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.rect(-80, -20, 160, 40);
      bg.fill({ color: 0x0088ff, alpha: 0.3 });
      bg.stroke({ color: 0x00ffff, width: 2 });
    });

    return container;
  }

  destroy() {
    this.layoutUnsubscribe?.();
    this.layoutUnsubscribe = null;
  }
}
