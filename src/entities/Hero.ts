import { Graphics, Sprite, Texture, Container } from 'pixi.js';
import { Vector2D } from '../utils/Vector2D';
import { MovableEntity } from './MovableEntity';

export class Hero extends MovableEntity {
  private container: Container;
  private sprite: Sprite | null = null;
  private targetPosition: Vector2D | null = null;
  private followerCount: number = 0;

  constructor(x: number, y: number, radius: number) {
    super(x, y, radius, 3);
    this.container = new Container();
    this.loadTexture();
  }

  private loadTexture(): void {
    try {
  // Use the public assets root; Vite will serve files from / by filename
  const texture = Texture.from('/pastuh.png');
  this.sprite = new Sprite(texture);
  console.log('[Hero] texture created, baseTexture:', texture.baseTexture);

      // Center the sprite early (anchor doesn't depend on loaded size)
      this.sprite.anchor.set(0.5);

      this.container.addChild(this.sprite);
      this.container.x = this.position.x;
      this.container.y = this.position.y;

      // Wait until the sprite has non-zero size (texture loaded) then scale
      const trySetScale = () => {
        if (!this.sprite) return;
        const w = this.sprite.width;
        const h = this.sprite.height;
        // track attempts so we can fallback if texture never loads correctly
        (trySetScale as any).attempts = ((trySetScale as any).attempts || 0) + 1;
        const attempts = (trySetScale as any).attempts;
        console.log('[Hero] sprite size try:', w, h, 'attempt', attempts);
        if (w > 0 && h > 0) {
          const scale = (this.radius * 2) / Math.max(w, h);
          this.sprite.scale.set(scale);
          console.log('[Hero] sprite scaled to', scale);
        } else if (attempts > 60) {
          console.warn('[Hero] texture did not report size after', attempts, 'frames — falling back to /pastuh.jpg');
          try {
            const fallback = Texture.from('/pastuh.jpg');
            if (this.sprite) this.sprite.texture = fallback;
            (trySetScale as any).attempts = 0;
            requestAnimationFrame(trySetScale);
          } catch (err) {
            console.error('[Hero] fallback texture load failed', err);
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
      console.warn('Failed to load pastuh texture, using fallback circle');
      this.drawFallback();
    }
  }

  private drawFallback(): void {
    const graphics = new Graphics();
    graphics.circle(0, 0, this.radius);
    graphics.fill(0xff0000);
    this.container.addChild(graphics);
    this.container.x = this.position.x;
    this.container.y = this.position.y;
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
        this.container.x = this.position.x;
        this.container.y = this.position.y;
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

  public getGraphics(): Container {
    return this.container;
  }
}