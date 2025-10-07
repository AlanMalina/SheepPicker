import { Game } from '../Game';

export class AnimalSpawner {
  private game: Game;
  private minInterval: number = 180; // 3 seconds at 60fps
  private maxInterval: number = 420; // 7 seconds at 60fps
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