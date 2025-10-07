import { Vector2D } from '../utils/Vector2D';

export abstract class MovableEntity {
  protected position: Vector2D;
  protected radius: number;
  protected speed: number;

  constructor(x: number, y: number, radius: number, speed: number) {
    this.position = new Vector2D(x, y);
    this.radius = radius;
    this.speed = speed;
  }

  public getPosition(): Vector2D {
    return this.position;
  }

  public getRadius(): number {
    return this.radius;
  }

  public abstract update(delta: number, ...args: any[]): void;
}