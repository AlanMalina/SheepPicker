import { Graphics } from 'pixi.js';
import { Vector2D } from '../utils/Vector2D';
import { MovableEntity } from './MovableEntity';

export class Hero extends MovableEntity {
  private graphics: Graphics;
  private targetPosition: Vector2D | null = null;
  private followerCount: number = 0;

  constructor(x: number, y: number, radius: number) {
    super(x, y, radius, 3);
    this.graphics = new Graphics();
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    this.graphics.circle(0, 0, this.radius);
    this.graphics.fill(0xff0000);
    this.graphics.x = this.position.x;
    this.graphics.y = this.position.y;
  }

  public moveTo(target: Vector2D): void {
    this.targetPosition = target;
  }

  public update(delta: number): void {
    if (this.targetPosition) {
      const direction = Vector2D.subtract(this.targetPosition, this.position);
      const distance = direction.magnitude();

      if (distance > 2) {
        const normalizedDirection = direction.normalize();
        const movement = normalizedDirection.scale(this.speed * delta);
        this.position = this.position.add(movement);
        this.graphics.x = this.position.x;
        this.graphics.y = this.position.y;
      } else {
        this.targetPosition = null;
      }
    }
  }

  public addFollower(): void {
    this.followerCount++;
  }

  public removeFollower(): void {
    this.followerCount = Math.max(0, this.followerCount - 1);
  }

  public getFollowerCount(): number {
    return this.followerCount;
  }

  public getGraphics(): Graphics {
    return this.graphics;
  }
}
