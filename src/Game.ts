import { Application, Container, Graphics, Text, Assets } from 'pixi.js';
import { Hero } from './entities/Hero';
import { Animal } from './entities/Animal';
import { Yard } from './entities/Yard';
import { ScoreManager } from './managers/ScoreManager';
import { AnimalSpawner } from './systems/AnimalSpawner';
import { Vector2D } from './utils/Vector2D';

export class Game {
  private static readonly HERO_RADIUS = 25;
  private static readonly ANIMAL_RADIUS = 15;

  private app: Application;
  private gameContainer: Container;
  private hero!: Hero;
  private animals: Animal[] = [];
  private yard!: Yard;
  private scoreManager!: ScoreManager;
  private scoreText!: Text;
  private collectedText!: Text;
  private messageText!: Text;
  private timerText!: Text;
  private animalSpawner!: AnimalSpawner;
  private gameTime: number = 60; // 60 seconds
  private isGameOver: boolean = false;
  private gameOverContainer!: Container;

  constructor(app: Application) {
    this.app = app;
    this.gameContainer = new Container();
    this.app.stage.addChild(this.gameContainer);
    this.scoreManager = new ScoreManager();
    this.initUI();
  }

  private async loadAssets(): Promise<void> {
    try {
      console.log('Loading game assets...');
      await Assets.load(['coolsheep.png', 'pastuh.png', 'grass.jpg']);
      console.log('Assets loaded successfully!');
    } catch (err) {
      console.warn('Asset load failed, using fallbacks', err);
    }
  }

  private initUI(): void {
    this.scoreText = new Text({
      text: 'Score: 0',
      style: {
        fontSize: 24,
        fill: 0xffffff,
      },
    });
    this.scoreText.x = 10;
    this.scoreText.y = 10;
    this.app.stage.addChild(this.scoreText);

    this.collectedText = new Text({
      text: 'Animals: 0/5',
      style: {
        fontSize: 24,
        fill: 0xffffff,
      },
    });
    this.collectedText.y = 10;
    this.app.stage.addChild(this.collectedText);

    this.messageText = new Text({
      text: '',
      style: {
        fontSize: 20,
        fill: 0xffff00,
        fontWeight: 'bold',
        align: 'center',
      },
    });
    this.messageText.y = 50;
    this.app.stage.addChild(this.messageText);

    // Timer text at top center
    this.timerText = new Text({
      text: '1:00',
      style: {
        fontSize: 32,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.timerText.y = 10;
    this.app.stage.addChild(this.timerText);
    this.updateTimerPosition();
  }

  private initGameObjects(): void {
    console.log('Initializing game objects...');
    
    // Create yard - positioned at bottom right with proper margins
    // Canvas: 1200x800, Yard: 300x140
    // Position: x=880 (1200-300-20), y=640 (800-140-20)
    this.yard = new Yard(500, 400, 300, 140);
    this.gameContainer.addChild(this.yard.getGraphics());
    this.gameContainer.addChild(this.yard.getBorderGraphics());

    // Create hero
    console.log('Creating hero...');
    this.hero = new Hero(150, 150, Game.HERO_RADIUS);
    this.gameContainer.addChild(this.hero.getGraphics());
    console.log('Hero created');

    // Create initial animals
    this.spawnInitialAnimals();
  }

  private spawnInitialAnimals(): void {
    const count = Math.floor(Math.random() * 6) + 5;
    for (let i = 0; i < count; i++) {
      this.spawnAnimal();
    }
  }

  public spawnAnimal(x?: number, y?: number): void {
    const spawnX = x !== undefined ? x : Math.random() * 1100 + 50;
    const spawnY = y !== undefined ? y : Math.random() * 700 + 50;
    const animal = new Animal(spawnX, spawnY, Game.ANIMAL_RADIUS);
    this.animals.push(animal);
    this.gameContainer.addChild(animal.getGraphics());
  }

  private setupEventListeners(): void {
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointerdown', (event) => {
      if (this.isGameOver) return;
      const pos = event.global;
      this.hero.moveTo(new Vector2D(pos.x, pos.y));
    });

    // Keyboard controls (WASD)
    const keys: Record<string, boolean> = {};
    const updateHeroDirection = () => {
      if (this.isGameOver) {
        this.hero.setVelocityDirection(0, 0);
        return;
      }
      let xDir = 0;
      let yDir = 0;
      if (keys['KeyW'] || keys['ArrowUp']) yDir -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) yDir += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) xDir -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) xDir += 1;
      this.hero.setVelocityDirection(xDir, yDir);
    };

    window.addEventListener('keydown', (e) => {
      keys[e.code] = true;
      updateHeroDirection();
    });

    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
      updateHeroDirection();
    });
  }

  public async start(): Promise<void> {
    await this.loadAssets();
    this.initGameObjects();
    this.setupEventListeners();
    this.animalSpawner = new AnimalSpawner(this, 1200, 800);
    this.app.ticker.add((ticker) => this.update(ticker.deltaTime));
  }

  private updateTimerPosition(): void {
    this.timerText.x = (this.app.screen.width - this.timerText.width) / 2;
  }

  private updateTimer(delta: number): void {
    if (this.isGameOver) return;
    
    // Decrease time (delta is in frames, 60 fps = 1 second per 60 frames)
    this.gameTime -= delta / 60;
    
    if (this.gameTime <= 0) {
      this.gameTime = 0;
      this.endGame();
    }
    
    // Format time as MM:SS
    const minutes = Math.floor(this.gameTime / 60);
    const seconds = Math.floor(this.gameTime % 60);
    this.timerText.text = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    this.updateTimerPosition();
    
    // Change color when time is running out
    if (this.gameTime <= 10) {
      this.timerText.style.fill = 0xff0000; // Red
    } else if (this.gameTime <= 30) {
      this.timerText.style.fill = 0xffaa00; // Orange
    }
  }

  private endGame(): void {
    this.isGameOver = true;
    
    // Stop hero movement
    this.hero.setVelocityDirection(0, 0);
    
    // Create game over screen
    this.gameOverContainer = new Container();
    
    // Semi-transparent background
    const overlay = new Graphics();
    overlay.rect(0, 0, 1200, 800);
    overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.gameOverContainer.addChild(overlay);
    
    // Game over panel - centered on screen
    const panelWidth = 600;
    const panelHeight = 400;
    const panelX = (1200 - panelWidth) / 2; // 300
    const panelY = (800 - panelHeight) / 4; // 200
    
    const panel = new Graphics();
    panel.rect(panelX, panelY, panelWidth, panelHeight);
    panel.fill(0x2a2a2a);
    panel.stroke({ width: 4, color: 0xffaa00 });
    this.gameOverContainer.addChild(panel);
    
    // Game Over text
    const gameOverText = new Text({
      text: 'GAME OVER',
      style: {
        fontSize: 64,
        fill: 0xffaa00,
        fontWeight: 'bold',
      },
    });
    gameOverText.x = 600 - gameOverText.width / 2;
    gameOverText.y = panelY + 60;
    this.gameOverContainer.addChild(gameOverText);
    
    // Final Score text
    const finalScoreText = new Text({
      text: `Final Score: ${this.scoreManager.getScore()}`,
      style: {
        fontSize: 48,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    finalScoreText.x = 600 - finalScoreText.width / 2;
    finalScoreText.y = panelY + 180;
    this.gameOverContainer.addChild(finalScoreText);
    
    // Restart hint
    const restartText = new Text({
      text: 'Refresh page to play again',
      style: {
        fontSize: 24,
        fill: 0xaaaaaa,
      },
    });
    restartText.x = 600 - restartText.width / 2;
    restartText.y = panelY + 300;
    this.gameOverContainer.addChild(restartText);
    
    this.app.stage.addChild(this.gameOverContainer);
  }

  private update(delta: number): void {
    if (this.isGameOver) return;
    
    this.updateTimer(delta);
    this.hero.update(delta);
    this.animalSpawner.update(delta);

    this.animals.forEach((animal) => {
      animal.update(delta, this.hero);

      if (animal.isInYard(this.yard) && !animal.isScored()) {
        animal.markAsScored();
        this.scoreManager.addScore(1);
        this.updateScoreDisplay();
      }
    });

    this.checkAnimalCollection();
    this.removeCompletedAnimals();
    this.updateCollectedDisplay();
    
    const isMaxReached = this.hero.getFollowerCount() >= 5;
    this.yard.setHighlight(isMaxReached, delta);
  }

  private checkAnimalCollection(): void {
    const collectionRadius = 50;
    const maxGroupSize = 5;

    this.animals.forEach((animal) => {
      if (!animal.isFollowing() && this.hero.getFollowerCount() < maxGroupSize) {
        const distance = Vector2D.distance(this.hero.getPosition(), animal.getPosition());
        if (distance < collectionRadius) {
          animal.startFollowing();
          this.hero.addFollower();
        }
      }
    });
  }

  private removeCompletedAnimals(): void {
    this.animals = this.animals.filter((animal) => {
      if (animal.shouldBeRemoved()) {
        this.gameContainer.removeChild(animal.getGraphics());
        this.hero.removeFollower();
        return false;
      }
      return true;
    });
  }

  private updateScoreDisplay(): void {
    this.scoreText.text = `Score: ${this.scoreManager.getScore()}`;
  }

  private updateCollectedDisplay(): void {
    const count = this.hero.getFollowerCount();
    this.collectedText.text = `Animals: ${count}/5`;
    this.collectedText.x = Math.max(10, this.app.screen.width - this.collectedText.width - 10);

    if (count >= 5) {
      this.messageText.text = 'Guide them to the YARD!';
      this.collectedText.style.fill = 0xff6600;
    } else {
      this.messageText.text = '';
      this.collectedText.style.fill = 0xffffff;
    }

    this.messageText.x = Math.max(0, (this.app.screen.width - this.messageText.width) / 2);
  }
}