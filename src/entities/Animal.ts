// src/entities/Animal.ts
import { Graphics, Sprite, Texture, Container } from 'pixi.js';
import { Vector2D } from '../utils/Vector2D';
import { MovableEntity } from './MovableEntity';
import { Hero } from './Hero';
import { Yard } from './Yard';

export class Animal extends MovableEntity {
  private container: Container;
  private sprite: Sprite | null = null;
  private following: boolean = false;
  private scored: boolean = false;
  private removeFlag: boolean = false;
  private patrolTarget: Vector2D | null = null;
  private patrolWaitTime: number = 0;

  constructor(x: number, y: number, radius: number) {
    super(x, y, radius, 2);
    this.container = new Container();
    this.container.x = x;
    this.container.y = y;
    this.loadTexture();
    this.setNewPatrolTarget();
  }

  private loadTexture(): void {
    try {
      console.log('[Animal] Loading sheep texture...');
      const texture = Texture.from('coolsheep.png');
      this.sprite = new Sprite(texture);
      
      this.sprite.anchor.set(0.5);
      this.container.addChild(this.sprite);

      const trySetScale = () => {
        if (!this.sprite) return;
        
        const w = this.sprite.width;
        const h = this.sprite.height;
        
        if (w > 0 && h > 0) {
          const targetSize = 50; // Sheep size - smaller
          const scale = targetSize / Math.max(w, h);
          this.sprite.scale.set(scale);
          console.log('[Animal] ✓ Sheep sprite scaled to', scale);
        } else {
          requestAnimationFrame(trySetScale);
        }
      };
      
      trySetScale();
    } catch (error) {
      console.warn('[Animal] Failed to load sheep texture:', error);
      this.drawFallback();
    }
  }

  private drawFallback(): void {
    console.log('[Animal] Drawing white circle fallback');
    const graphics = new Graphics();
    graphics.circle(0, 0, this.radius);
    graphics.fill(0xffffff);
    this.container.addChild(graphics);
  }

  private setNewPatrolTarget(): void {
    this.patrolTarget = new Vector2D(
      Math.random() * 1100 + 50,
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
        this.container.x = this.position.x;
        this.container.y = this.position.y;
      } else {
        this.setNewPatrolTarget();
      }
    }
  }

  private followHero(hero: Hero, delta: number): void {
    const heroPos = hero.getPosition();
    const direction = Vector2D.subtract(heroPos, this.position);
    const distance = direction.magnitude();

    if (distance > 40) {
      const normalizedDirection = direction.normalize();
      const movement = normalizedDirection.scale(this.speed * delta);
      this.position = this.position.add(movement);
      this.container.x = this.position.x;
      this.container.y = this.position.y;
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

  public getGraphics(): Container {
    return this.container;
  }
}