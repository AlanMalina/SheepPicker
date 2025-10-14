import { Container, Sprite, Assets } from 'pixi.js';
import { Vector2D } from '../utils/Vector2D';
import { Hero } from './Hero';

export class Boss {
  private container: Container;
  private sprite: Sprite;
  private position: Vector2D;
  private speed: number;
  private active: boolean;
  private spawnTime: number = 0;

  constructor(x: number, y: number) {
    this.container = new Container();
    this.position = new Vector2D(x, y);
    this.speed = 2.4; // Slower than hero
    this.active = true;

    // Create sprite from image
    this.sprite = Sprite.from('boss.png');
    this.sprite.anchor.set(0.5); // center the sprite
    this.sprite.width = 120;       // optional: set size
    this.sprite.height = 150;
    this.container.addChild(this.sprite);

    this.container.x = x;
    this.container.y = y;

    this.spawnTime = Date.now();
  }

  public getGraphics(): Container {
    return this.container;
  }

  public isActive(): boolean {
    return this.active;
  }

  public update(delta: number, hero: Hero): void {
    if (!this.active) return;

    // Move toward hero
    const direction = Vector2D.subtract(hero.getPosition(), this.position);
    const distance = direction.magnitude();

    if (distance > 1) {
      const move = direction.normalize().scale(this.speed * delta);
      this.position = this.position.add(move);
      this.container.x = this.position.x;
      this.container.y = this.position.y;
    }

    // Despawn after 10 seconds
    if (Date.now() - this.spawnTime > 10000) {
      this.destroy();
    }
  }

  public checkHeroCollision(hero: Hero): boolean {
    const distance = Vector2D.distance(hero.getPosition(), this.position);
    return distance < 45; // hit radius
  }

  public destroy(): void {
    this.active = false;
    this.container.destroy({ children: true });
  }
}
