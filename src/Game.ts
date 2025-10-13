// src/Game.ts
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
  private static readonly NORMAL_VOLUME = 0.3;
  private static readonly FADED_VOLUME = 0.05;
  private static readonly FADE_RATE = 2;

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
  private isGameStarted: boolean = false;
  private gameOverContainer!: Container;
  private startMenuContainer!: Container;
  private isFadingMusic: boolean = false;
  private targetVolume: number = 0.3;
  private fadeRate: number = 0.05;
  private backgroundMusic: HTMLAudioElement | null = null;
  private musicFadeTimeout: number | null = null;

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
      
      // Load background music
      this.backgroundMusic = new Audio('slipknot-psychosocial.mp3');
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = Game.NORMAL_VOLUME;
      
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
    this.collectedText.x = 1057;
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

    const muteButton = new Text({
      text: '🔊',
      style: {
        fontSize: 32,
        fill: 0xffffff,
      },
    });
    muteButton.x = this.app.screen.width - 190;
    muteButton.y = 5;
    muteButton.eventMode = 'static';
    muteButton.cursor = 'pointer';
    
    muteButton.on('pointerdown', () => {
      if (this.backgroundMusic) {
        if (this.backgroundMusic.muted) {
          this.backgroundMusic.muted = false;
          muteButton.text = '🔊'; 
        } else {
          this.backgroundMusic.muted = true;
          muteButton.text = '🔇';
        }
      }
    });
  
    this.app.stage.addChild(muteButton);
  }

  private initGameObjects(): void {
    console.log('Initializing game objects...');
    
    // Create yard
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
    let spawnX: number;
    let spawnY: number;
    
    if (x !== undefined && y !== undefined) {
      spawnX = x;
      spawnY = y;
    } else {
      // Keep trying to find a valid spawn position that's not in the yard
      let attempts = 0;
      const maxAttempts = 50;
      
      do {
        spawnX = Math.random() * 1100 + 50;
        spawnY = Math.random() * 700 + 50;
        attempts++;
      } while (this.isPositionInYard(spawnX, spawnY) && attempts < maxAttempts);
      
      // If we couldn't find a valid position after max attempts, spawn in a safe zone
      if (attempts >= maxAttempts) {
        spawnX = 150;
        spawnY = 150;
      }
    }
    
    const animal = new Animal(spawnX, spawnY, Game.ANIMAL_RADIUS);
    this.animals.push(animal);
    this.gameContainer.addChild(animal.getGraphics());
  }

  private isPositionInYard(x: number, y: number): boolean {
    // Yard position: (500, 350), size: 300x140
    // Add some margin to prevent spawning too close to yard edges
    const margin = 20;
    return (
      x >= 500 - margin &&
      x <= 500 + 300 + margin &&
      y >= 350 - margin &&
      y <= 350 + 140 + margin
    );
  }

  private setupEventListeners(): void {
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointerdown', (event) => {
      if (this.isGameOver || !this.isGameStarted) return;
      const pos = event.global;
      this.hero.moveTo(new Vector2D(pos.x, pos.y));
    });

    // Keyboard controls (WASD)
    const keys: Record<string, boolean> = {};
    const updateHeroDirection = () => {
      if (this.isGameOver || !this.isGameStarted) {
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
    // Show loading state
    this.showLoadingScreen();
    
    await this.loadAssets();
    this.initGameObjects();
    this.setupEventListeners();
    this.animalSpawner = new AnimalSpawner(this, 1200, 800);
    
    // Hide loading and show start menu
    this.hideLoadingScreen();
    this.showStartMenu();
    
    this.app.ticker.add((ticker) => this.update(ticker.deltaTime));
  }

  private showLoadingScreen(): void {
    const loadingContainer = new Container();
    loadingContainer.label = 'loading';
    
    const overlay = new Graphics();
    overlay.rect(0, 0, 1200, 800);
    overlay.fill({ color: 0x228B22, alpha: 1 });
    loadingContainer.addChild(overlay);
    
    const loadingText = new Text({
      text: 'Loading...',
      style: {
        fontSize: 48,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    loadingText.x = 600 - loadingText.width / 2;
    loadingText.y = 300 - loadingText.height / 2;
    loadingContainer.addChild(loadingText);
    
    this.app.stage.addChild(loadingContainer);
  }

  private hideLoadingScreen(): void {
    const loadingContainer = this.app.stage.children.find(child => child.label === 'loading');
    if (loadingContainer) {
      this.app.stage.removeChild(loadingContainer);
    }
  }

  private showStartMenu(): void {
    this.startMenuContainer = new Container();
    this.startMenuContainer.label = 'startMenu';
    
    // Semi-transparent background
    const overlay = new Graphics();
    overlay.rect(0, 0, 1200, 800);
    overlay.fill({ color: 0x000000, alpha: 0.7 });
    overlay.eventMode = 'static';
    this.startMenuContainer.addChild(overlay);
    
    // Menu panel - centered on screen
    const panelWidth = 600;
    const panelHeight = 400;
    const panelX = (1200 - panelWidth) / 2;
    const panelY = (800 - panelHeight) / 4;
    
    const panel = new Graphics();
    panel.rect(panelX, panelY, panelWidth, panelHeight);
    panel.fill(0x2a2a2a);
    panel.stroke({ width: 4, color: 0x4CAF50 });
    this.startMenuContainer.addChild(panel);
    
    // Game title
    const titleText = new Text({
      text: 'SHEEP PICKER',
      style: {
        fontSize: 56,
        fill: 0x4CAF50,
        fontWeight: 'bold',
      },
    });
    titleText.x = 600 - titleText.width / 2;
    titleText.y = panelY + 60;
    this.startMenuContainer.addChild(titleText);
    
    // Instructions
    const instructionsText = new Text({
      text: 'Collect sheeps and guide them to the yard!\nYou have 60 seconds.',
      style: {
        fontSize: 22,
        fill: 0xffffff,
        align: 'center',
      },
    });
    instructionsText.x = 600 - instructionsText.width / 2;
    instructionsText.y = panelY + 160;
    this.startMenuContainer.addChild(instructionsText);
    
    // Play button container
    const buttonContainer = new Container();
    buttonContainer.x = 600;
    buttonContainer.y = panelY + 290;
    buttonContainer.eventMode = 'static';
    buttonContainer.cursor = 'pointer';
    
    const buttonWidth = 200;
    const buttonHeight = 60;
    
    const playButton = new Graphics();
    playButton.rect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight);
    playButton.fill(0x4CAF50);
    playButton.stroke({ width: 2, color: 0xffffff });
    buttonContainer.addChild(playButton);
    
    const playText = new Text({
      text: 'PLAY',
      style: {
        fontSize: 32,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    playText.anchor.set(0.5);
    buttonContainer.addChild(playText);
    
    // Button hover effect
    buttonContainer.on('pointerover', () => {
      playButton.clear();
      playButton.rect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight);
      playButton.fill(0x66BB6A);
      playButton.stroke({ width: 2, color: 0xffffff });
    });
    
    buttonContainer.on('pointerout', () => {
      playButton.clear();
      playButton.rect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight);
      playButton.fill(0x4CAF50);
      playButton.stroke({ width: 2, color: 0xffffff });
    });
    
    // Button click
    buttonContainer.on('pointerdown', () => {
      console.log('Play button clicked!');
      this.startGame();
    });
    
    this.startMenuContainer.addChild(buttonContainer);
    this.app.stage.addChild(this.startMenuContainer);
    
    console.log('Start menu displayed');
  }

  private startGame(): void {
    console.log('Starting game...');
    this.isGameStarted = true;
    this.isGameOver = false;
    this.gameTime = 60;
    
    // Clear any pending music fade timeout
    if (this.musicFadeTimeout !== null) {
      window.clearTimeout(this.musicFadeTimeout);
      this.musicFadeTimeout = null;
    }
    
    // Remove start menu
    if (this.startMenuContainer) {
      this.app.stage.removeChild(this.startMenuContainer);
      this.startMenuContainer.destroy({ children: true });
    }
    
    // Start background music
    if (this.backgroundMusic) {
      this.backgroundMusic.currentTime = 0;
      this.backgroundMusic.volume = 0.05;
      this.targetVolume = 0.3;
      this.isFadingMusic = true;
      this.backgroundMusic.play().catch(err => {
        console.warn('Failed to play background music:', err);
      });
    }
    
    // Reset timer display
    this.timerText.text = '1:00';
    this.timerText.style.fill = 0xffffff;
    this.updateTimerPosition();
    
    console.log('Game started!');
  }

  private resetGame(): void {
    // Reset score
    this.scoreManager.resetScore();
    this.updateScoreDisplay();
    
    // Reset hero
    this.hero.setVelocityDirection(0, 0);
    this.hero.getPosition().x = 150;
    this.hero.getPosition().y = 150;
    
    // Clear all animals
    this.animals.forEach(animal => {
      this.gameContainer.removeChild(animal.getGraphics());
    });
    this.animals = [];
    
    // Spawn new animals
    this.spawnInitialAnimals();
    
    // Reset collected count
    while (this.hero.getFollowerCount() > 0) {
      this.hero.removeFollower();
    }
    this.updateCollectedDisplay();
  }

  private updateTimerPosition(): void {
    this.timerText.x = (this.app.screen.width - this.timerText.width) / 2;
  }

  private updateTimer(delta: number): void {
    if (this.isGameOver || !this.isGameStarted) return;
    
    // Decrease time
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
      this.timerText.style.fill = 0xff0000;
    } else if (this.gameTime <= 30) {
      this.timerText.style.fill = 0xffaa00;
    }
  }

  private endGame(): void {
    console.log('Game ending...');
    this.isGameOver = true;
    this.isGameStarted = false;
    
    // Wait 3 seconds before fading music
    if (this.backgroundMusic && !this.backgroundMusic.muted) {
      this.musicFadeTimeout = window.setTimeout(() => {
        this.targetVolume = Game.FADED_VOLUME; 
        this.isFadingMusic = true;
      }, 2500); // 2.5 seconds delay
    }

    // Stop hero movement
    this.hero.setVelocityDirection(0, 0);
    
    // Create game over screen
    this.gameOverContainer = new Container();
    this.gameOverContainer.label = 'gameOver';
    
    // Semi-transparent background
    const overlay = new Graphics();
    overlay.rect(0, 0, 1200, 800);
    overlay.fill({ color: 0x000000, alpha: 0.7 });
    overlay.eventMode = 'static';
    this.gameOverContainer.addChild(overlay);
    
    // Game over panel
    const panelWidth = 600;
    const panelHeight = 400;
    const panelX = (1200 - panelWidth) / 2;
    const panelY = (800 - panelHeight) / 4;
    
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
    finalScoreText.y = panelY + 160;
    this.gameOverContainer.addChild(finalScoreText);
    
    // Play Again button container
    const buttonContainer = new Container();
    buttonContainer.x = 600;
    buttonContainer.y = panelY + 310;
    buttonContainer.eventMode = 'static';
    buttonContainer.cursor = 'pointer';
    
    const buttonWidth = 200;
    const buttonHeight = 60;
    
    const playAgainButton = new Graphics();
    playAgainButton.rect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight);
    playAgainButton.fill(0x4CAF50);
    playAgainButton.stroke({ width: 2, color: 0xffffff });
    buttonContainer.addChild(playAgainButton);
    
    const playAgainText = new Text({
      text: 'PLAY AGAIN',
      style: {
        fontSize: 28,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    playAgainText.anchor.set(0.5);
    buttonContainer.addChild(playAgainText);
    
    // Button hover effect
    buttonContainer.on('pointerover', () => {
      playAgainButton.clear();
      playAgainButton.rect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight);
      playAgainButton.fill(0x66BB6A);
      playAgainButton.stroke({ width: 2, color: 0xffffff });
    });
    
    buttonContainer.on('pointerout', () => {
      playAgainButton.clear();
      playAgainButton.rect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight);
      playAgainButton.fill(0x4CAF50);
      playAgainButton.stroke({ width: 2, color: 0xffffff });
    });
    
    // Button click
    buttonContainer.on('pointerdown', () => {
      console.log('Play Again clicked!');
      this.app.stage.removeChild(this.gameOverContainer);
      this.gameOverContainer.destroy({ children: true });
      this.resetGame();
      this.startGame();
    });
    
    this.gameOverContainer.addChild(buttonContainer);
    this.app.stage.addChild(this.gameOverContainer);
    
    console.log('Game over screen displayed');
  }

  private update(delta: number): void {
    this.updateMusicFade(delta);

    if (this.isGameOver || !this.isGameStarted) return;
    
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

  private updateMusicFade(delta: number): void {
    if (!this.isFadingMusic || !this.backgroundMusic) return;

    const fadeDuration = 40; // seconds
    const currentVolume = this.backgroundMusic.volume;
    const step = (delta / 60) * (1 / fadeDuration); // delta ≈ кадри, тому /60 ≈ секунда

    if (currentVolume > this.targetVolume) {
        // Fade DOWN
        this.backgroundMusic.volume = Math.max(
            this.targetVolume,
            currentVolume - step
        );
    } else if (currentVolume < this.targetVolume) {
        // Fade UP
        this.backgroundMusic.volume = Math.min(
            this.targetVolume,
            currentVolume + step
        );
    }

    // Якщо досягли цілі
    if (this.backgroundMusic.volume === this.targetVolume) {
        this.isFadingMusic = false;
    }
    }
}