import { Graphics } from 'pixi.js';
import { Vector2D } from '../utils/Vector2D';
import { MovableEntity } from './MovableEntity';
import { Hero } from './Hero';
import { Yard } from './Yard';

export class Animal extends MovableEntity {
  private graphics: Graphics;
  private following: boolean = false;
  private scored: boolean = false;
  private removeFlag: boolean = false;
  private patrolTarget: Vector2D | null = null;
  private patrolWaitTime: number = 0;

  constructor(x: number, y: number, radius: number) {
    super(x, y, radius, 2);
    this.graphics = new Graphics();
    this.draw();
    this.setNewPatrolTarget();
  }

  private draw(): void {
    this.graphics.clear();
    this.graphics.circle(0, 0, this.radius);
    this.graphics.fill(0xffffff);
    this.graphics.x = this.position.x;
    this.graphics.y = this.position.y;
  }

  private setNewPatrolTarget(): void {
    this.patrolTarget = new Vector2D(
      Math.random() * 700 + 50,
      Math.random() * 500 + 50
    );
    this.patrolWaitTime = Math.random() * 60 + 30;
  }

  public update(delta: number, hero: Hero): void {
    if (this.following) {
      this.followHero(hero, delta);
    } else {
      this.patrol(delta);
    }
  }

  private patrol(delta: number): void {
    if (this.patrolWaitTime > 0) {
      this.patrolWaitTime -= delta;
      return;
    }

    if (this.patrolTarget) {
      const direction = Vector2D.subtract(this.patrolTarget, this.position);
      const distance = direction.magnitude();

      if (distance > 2) {
        const normalizedDirection = direction.normalize();
        const movement = normalizedDirection.scale(this.speed * 0.5 * delta);
        this.position = this.position.add(movement);
        this.graphics.x = this.position.x;
        this.graphics.y = this.position.y;
      } else {
        this.setNewPatrolTarget();
      }
    }
  }

  private followHero(hero: Hero, delta: number): void {
    const heroPos = hero.getPosition();
    const direction = Vector2D.subtract(heroPos, this.position);
    const distance = direction.magnitude();

    if (distance > 25) {
      const normalizedDirection = direction.normalize();
      const movement = normalizedDirection.scale(this.speed * delta);
      this.position = this.position.add(movement);
      this.graphics.x = this.position.x;
      this.graphics.y = this.position.y;
    }
  }

  public startFollowing(): void {
    this.following = true;
  }

  public isFollowing(): boolean {
    return this.following;
  }

  public isInYard(yard: Yard): boolean {
    if (!this.following) return false;
    return yard.contains(this.position);
  }

  public markAsScored(): void {
    this.scored = true;
    this.removeFlag = true;
  }

  public isScored(): boolean {
    return this.scored;
  }

  public shouldBeRemoved(): boolean {
    return this.removeFlag;
  }

  public getGraphics(): Graphics {
    return this.graphics;
  }
}