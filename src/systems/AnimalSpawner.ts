import { Game } from '../Game';

export class AnimalSpawner {
  private game: Game;
  // Fixed spawn interval: 1.5 seconds * 60fps = 90 ticks
  private minInterval: number = 90;
  private maxInterval: number = 90;
  private timer: number = 0;
  private nextSpawnTime: number;
  private maxAnimals: number = 15;
  private gameWidth: number;
  private gameHeight: number;

  constructor(game: Game, width: number, height: number) {
    this.game = game;
    this.gameWidth = width;
    this.gameHeight = height;
    this.nextSpawnTime = this.getRandomInterval();
  }

  private getRandomInterval(): number {
    // min and max are equal so this returns a fixed interval (90)
    return Math.random() * (this.maxInterval - this.minInterval) + this.minInterval;
  }

  public update(delta: number): void {
    this.timer += delta;

    if (this.timer >= this.nextSpawnTime) {
      this.game.spawnAnimal();
      this.timer = 0;
      this.nextSpawnTime = this.getRandomInterval();
    }
  }
}