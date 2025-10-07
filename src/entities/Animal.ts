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
    this.loadTexture();
    this.setNewPatrolTarget();
  }

  private loadTexture(): void {
    try {
  const texture = Texture.from('/sheep.jpg');
  this.sprite = new Sprite(texture);
  console.log('[Animal] texture created, baseTexture:', texture.baseTexture);

      // Center anchor
      this.sprite.anchor.set(0.5);

      this.container.addChild(this.sprite);
      this.container.x = this.position.x;
      this.container.y = this.position.y;

      const trySetScale = () => {
        if (!this.sprite) return;
        const w = this.sprite.width;
        const h = this.sprite.height;
        // track attempts so we can fallback if texture never loads correctly
        (trySetScale as any).attempts = ((trySetScale as any).attempts || 0) + 1;
        const attempts = (trySetScale as any).attempts;
        console.log('[Animal] sprite size try:', w, h);
        if (w > 0 && h > 0) {
          const scale = (this.radius * 2) / Math.max(w, h);
          this.sprite.scale.set(scale);
          console.log('[Animal] sprite scaled to', scale);
        } else if (attempts > 60) {
          console.warn('[Animal] texture did not report size after', attempts, 'frames — falling back to /sheep.jpg');
          try {
            const fallback = Texture.from('/sheepsvg.png');
            this.sprite.texture = fallback;
            // reset attempt counter and try scaling again
            (trySetScale as any).attempts = 0;
            requestAnimationFrame(trySetScale);
          } catch (err) {
            console.error('[Animal] fallback texture load failed', err);
            // give up and keep fallback circle (drawFallback was not called because sprite exists), so remove sprite
            if (this.sprite) this.container.removeChild(this.sprite);
            this.sprite = null;
            this.drawFallback();
          }
        } else {
          requestAnimationFrame(trySetScale);
        }
      };

      trySetScale();
    } catch (error) {
      console.warn('Failed to load sheep texture, using fallback circle');
      this.drawFallback();
    }
  }

  private drawFallback(): void {
    const graphics = new Graphics();
    graphics.circle(0, 0, this.radius);
    graphics.fill(0xffffff);
    this.container.addChild(graphics);
    this.container.x = this.position.x;
    this.container.y = this.position.y;
  }

  private setNewPatrolTarget(): void {
    this.patrolTarget = new Vector2D(
      Math.random() * 700 + 50,
      Math.random() * 500 + 50
    );
    this.patrolWaitTime = Math.random() * 60 + 30; // 30-90 frames wait
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

    if (distance > 25) {
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
