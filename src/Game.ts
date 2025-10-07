import { Application, Container, Graphics, Text } from 'pixi.js';
import { Hero } from './entities/Hero';
import { Animal } from './entities/Animal';
import { Yard } from './entities/Yard';
import { ScoreManager } from './managers/ScoreManager';
import { AnimalSpawner } from './systems/AnimalSpawner';
import { Vector2D } from './utils/Vector2D';

export class Game {
  private app: Application;
  private gameContainer: Container;
  private hero: Hero;
  private animals: Animal[] = [];
  private yard: Yard;
  private scoreManager: ScoreManager;
  private scoreText: Text;
  private collectedText: Text;
  private messageText: Text;
  private animalSpawner: AnimalSpawner;

  constructor(app: Application) {
    this.app = app;
    this.gameContainer = new Container();
    this.app.stage.addChild(this.gameContainer);

    this.scoreManager = new ScoreManager();
    this.initUI();
    this.initGameObjects();
    this.setupEventListeners();
    this.animalSpawner = new AnimalSpawner(this, 800, 600);
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
    this.collectedText.x = 650;
    this.collectedText.y = 10;
    this.app.stage.addChild(this.collectedText);

    this.messageText = new Text({
      text: '',
      style: {
        fontSize: 20,
        fill: 0xffff00,
        fontWeight: 'bold',
      },
    });
    this.messageText.x = 250;
    this.messageText.y = 50;
    this.app.stage.addChild(this.messageText);
  }

  private initGameObjects(): void {
    this.yard = new Yard(650, 450, 120, 120);
    this.gameContainer.addChild(this.yard.getGraphics());
    this.gameContainer.addChild(this.yard.getBorderGraphics());

    this.hero = new Hero(100, 100, 15);
    this.gameContainer.addChild(this.hero.getGraphics());

    this.spawnInitialAnimals();
  }

  private spawnInitialAnimals(): void {
    const count = Math.floor(Math.random() * 6) + 5;
    for (let i = 0; i < count; i++) {
      this.spawnAnimal();
    }
  }

  public spawnAnimal(): void {
    const x = Math.random() * 700 + 50;
    const y = Math.random() * 500 + 50;
    const animal = new Animal(x, y, 10);
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
  }

  public start(): void {
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
    
    if (count >= 5) {
      this.messageText.text = 'Guide them to the YARD!';
      this.collectedText.style.fill = 0xff6600;
    } else {
      this.messageText.text = '';
      this.collectedText.style.fill = 0xffffff;
    }
  }
}