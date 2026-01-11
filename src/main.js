import * as PIXI from 'pixi.js';
import { Game } from './game/Game.js';
import { AudioManager } from './audio/AudioManager.js';

// Initialize PixiJS application
const app = new PIXI.Application();

async function init() {
  await app.init({
    width: 800,
    height: 600,
    backgroundColor: 0x000000,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: false
  });

  document.getElementById('game-container').appendChild(app.canvas);
  document.getElementById('loading').style.display = 'none';

  // Initialize audio
  AudioManager.init();

  // Create and start game
  const game = new Game(app);
  game.start();

  // Game loop
  app.ticker.add((delta) => {
    game.update(delta.deltaTime);
  });
}

init();
