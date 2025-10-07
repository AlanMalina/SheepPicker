import { Application } from 'pixi.js';
import { Game } from './Game';

const app = new Application();

async function init() {
  await app.init({
    width: 1200,
    height: 800,
    backgroundColor: 0x228B22,
  });

  document.body.appendChild(app.canvas);

  const game = new Game(app);
  await game.start();
}

init();
