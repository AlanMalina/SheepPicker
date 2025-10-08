//Hero.ts
import { Graphics, Sprite, Texture, Container } from 'pixi.js';
import { Vector2D } from '../utils/Vector2D';
import { MovableEntity } from './MovableEntity';

export class Hero extends MovableEntity {
  private container: Container;
  private sprite: Sprite | null = null;
  private targetPosition: Vector2D | null = null;
  private followerCount: number = 0;

  // new property to track movement direction from keyboard
  private velocity: Vector2D = new Vector2D(0, 0);

  constructor(x: number, y: number, radius: number) {
    super(x, y, radius, 3);
    this.container = new Container();
    this.loadTexture();
  }

  // called by Game when keys are pressed/released
  public setVelocityDirection(xDir: number, yDir: number): void {
    this.velocity = new Vector2D(xDir, yDir);
    // cancel click movement if moving manually
    if (xDir !== 0 || yDir !== 0) {
      this.targetPosition = null;
    }
  }

  private loadTexture(): void {
    try {
      const texture = Texture.from('/pastuh.png');
      this.sprite = new Sprite(texture);
      this.sprite.anchor.set(0.5);

      this.container.addChild(this.sprite);
      this.container.x = this.position.x;
      this.container.y = this.position.y;

      const trySetScale = () => {
        if (!this.sprite) return;
        const w = this.sprite.width;
        const h = this.sprite.height;
        (trySetScale as any).attempts = ((trySetScale as any).attempts || 0) + 1;
        const attempts = (trySetScale as any).attempts;
        if (w > 0 && h > 0) {
          const scale = (this.radius * 2) / Math.max(w, h);
          this.sprite.scale.set(scale);
        } else if (attempts <= 60) {
          requestAnimationFrame(trySetScale);
        } else {
          this.drawFallback();
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
    // 🕹️ Keyboard movement
    if (this.velocity.x !== 0 || this.velocity.y !== 0) {
      const moveDir = this.velocity.normalize();
      const movement = moveDir.scale(this.speed * delta);
      this.position = this.position.add(movement);
      this.container.x = this.position.x;
      this.container.y = this.position.y;
      return;
    }

    // 🖱️ Click-based movement
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
