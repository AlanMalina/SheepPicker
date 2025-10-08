// src/Game.ts
import { Application, Container, Text, Assets } from 'pixi.js';
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
  private animalSpawner!: AnimalSpawner;

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
      await Assets.load(['coolsheep.png', 'pastuh.png']);
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
  }

  private initGameObjects(): void {
    console.log('Initializing game objects...');
    
    // Create yard - positioned in bottom right (with margin)
    // Canvas is 1200x800, yard is 160x160
    // Position: x=1020 (1200-160-20), y=620 (800-160-20)
    this.yard = new Yard(500, 350, 300, 140);
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
      const pos = event.global;
      this.hero.moveTo(new Vector2D(pos.x, pos.y));
    });

    // Keyboard controls (WASD)
    const keys: Record<string, boolean> = {};
    const updateHeroDirection = () => {
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
    this.app.ticker.add(() => this.update(this.app.ticker.deltaTime));
  }

  private update(delta: number): void {
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