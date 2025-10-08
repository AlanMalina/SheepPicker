import { Application, Container, Graphics, Text, Assets } from 'pixi.js';
import { Hero } from './entities/Hero';
import { Animal } from './entities/Animal';
import { Yard } from './entities/Yard';
import { ScoreManager } from './managers/ScoreManager';
import { AnimalSpawner } from './systems/AnimalSpawner';
import { Vector2D } from './utils/Vector2D';

export class Game {
  // tweak these to change visual size of characters
  // Updated per request: hero radius 60, animal radius 30
  private static readonly HERO_RADIUS = 50;
  private static readonly ANIMAL_RADIUS = 25;

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
    // DO NOT create game objects here; wait for assets to load in start()
  }

  private async loadAssets(): Promise<void> {
    try {
  console.log('Loading assets...');
  // preload the sheep SVG/png so Animal can use it immediately
  await Assets.load(['/sheep.jpg', '/pastuh.png', '/coolsheep.png']);
      console.log('Assets loaded');
    } catch (err) {
      console.warn('Asset load failed, continuing without preload', err);
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
    // x will be computed dynamically to keep it at the right edge
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
    // start near the top; x will be centered dynamically in updateCollectedDisplay()
    this.messageText.y = 50;
    this.app.stage.addChild(this.messageText);
  }

  private initGameObjects(): void {
    // Create yard
    this.yard = new Yard(650, 450, 120, 120);
    this.gameContainer.addChild(this.yard.getGraphics());
    this.gameContainer.addChild(this.yard.getBorderGraphics());

  // Create hero (use HERO_RADIUS)
  this.hero = new Hero(100, 100, Game.HERO_RADIUS);
    this.gameContainer.addChild(this.hero.getGraphics());

    // Create initial animals
    this.spawnInitialAnimals();
  }

  private spawnInitialAnimals(): void {
    const count = Math.floor(Math.random() * 6) + 5; // 5-10 animals
    for (let i = 0; i < count; i++) {
      this.spawnAnimal();
    }
  }

  public spawnAnimal(x?: number, y?: number): void {
    // If coordinates aren't provided, pick a reasonable default area
    const spawnX = typeof x === 'number' ? x : Math.random() * 700 + 50;
    const spawnY = typeof y === 'number' ? y : Math.random() * 500 + 50;
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
    // === 🧭 Keyboard controls ===
    const keys: Record<string, boolean> = {};

    const updateHeroDirection = () => {
      let xDir = 0;
      let yDir = 0;
      if (keys['KeyW']) yDir -= 1;
      if (keys['KeyS']) yDir += 1;
      if (keys['KeyA']) xDir -= 1;
      if (keys['KeyD']) xDir += 1;
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
    this.animalSpawner = new AnimalSpawner(this, 1200, 600);
    this.app.ticker.add(() => this.update(this.app.ticker.deltaTime));

    
  }

  private update(delta: number): void {
    this.hero.update(delta);
    this.animalSpawner.update(delta);

    // Update animals
    this.animals.forEach((animal) => {
      animal.update(delta, this.hero);

      // Check if animal reached yard
      if (animal.isInYard(this.yard) && !animal.isScored()) {
        animal.markAsScored();
        this.scoreManager.addScore(1);
        this.updateScoreDisplay();
      }
    });

    // Check hero proximity to animals
    this.checkAnimalCollection();

    // Remove scored animals
    this.removeCompletedAnimals();

    // Update UI and yard state
    this.updateCollectedDisplay();
    const isMaxReached = this.hero.getFollowerCount() >= 5;
    this.yard.setHighlight(isMaxReached, delta);
  }

  private checkAnimalCollection(): void {
    const collectionRadius = 30;
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
    // position on the right with 10px padding
    this.collectedText.x = Math.max(10, this.app.screen.width - this.collectedText.width - 10);

    if (count >= 5) {
      this.messageText.text = 'Guide them to the YARD!';
      this.collectedText.style.fill = 0xff6600;
    } else {
      this.messageText.text = '';
      this.collectedText.style.fill = 0xffffff;
    }
    // center the message text horizontally
    this.messageText.x = Math.max(0, (this.app.screen.width - this.messageText.width) / 2);
  }

  
}