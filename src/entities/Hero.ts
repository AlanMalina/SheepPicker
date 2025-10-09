// src/entities/Hero.ts
import { Graphics, Sprite, Texture, Container } from 'pixi.js';
import { Vector2D } from '../utils/Vector2D';
import { MovableEntity } from './MovableEntity';

export class Hero extends MovableEntity {
  private container: Container;
  private sprite: Sprite | null = null;
  private targetPosition: Vector2D | null = null;
  private followerCount: number = 0;
  private velocityX: number = 0;
  private velocityY: number = 0;

  constructor(x: number, y: number, radius: number) {
    super(x, y, radius, 3);
    this.container = new Container();
    this.container.x = x;
    this.container.y = y;
    this.loadTexture();
  }

  private loadTexture(): void {
    try {
      console.log('[Hero] Loading pastuh texture...');
      const texture = Texture.from('pastuh.png');
      this.sprite = new Sprite(texture);
      
      this.sprite.anchor.set(0.5);
      this.container.addChild(this.sprite);

      const trySetScale = () => {
        if (!this.sprite) return;
        
        const w = this.sprite.width;
        const h = this.sprite.height;
        
        console.log('[Hero] Sprite size:', w, 'x', h);
        
        if (w > 0 && h > 0) {
          const targetSize = 80; // Hero size
          const scale = targetSize / Math.max(w, h);
          this.sprite.scale.set(scale);
          console.log('[Hero] ✓ Pastuh sprite scaled to', scale);
        } else {
          requestAnimationFrame(trySetScale);
        }
      };
      
      trySetScale();
    } catch (error) {
      console.error('[Hero] Failed to load pastuh texture:', error);
      this.drawFallback();
    }
  }

  private drawFallback(): void {
    console.log('[Hero] Drawing red circle fallback');
    const graphics = new Graphics();
    graphics.circle(0, 0, this.radius);
    graphics.fill(0xff0000);
    this.container.addChild(graphics);
  }

  public setVelocityDirection(xDir: number, yDir: number): void {
    this.velocityX = xDir;
    this.velocityY = yDir;
  }

  public moveTo(target: Vector2D): void {
    this.targetPosition = target;
  }

  public update(delta: number): void {
    // Keyboard movement
    if (this.velocityX !== 0 || this.velocityY !== 0) {
      const velocity = new Vector2D(this.velocityX, this.velocityY).normalize();
      const movement = velocity.scale(this.speed * delta);
      this.position = this.position.add(movement);
      
      // Clamp position to green field boundaries (accounting for border)
      const borderSize = 2; // Canvas border thickness
      const margin = this.radius + 5; // Add extra padding
      this.position.x = Math.max(borderSize + margin, Math.min(1200 - borderSize - margin, this.position.x));
      this.position.y = Math.max(borderSize + margin, Math.min(800 - borderSize - margin - 200, this.position.y));
      
      this.container.x = this.position.x;
      this.container.y = this.position.y;
      this.targetPosition = null; // Cancel click movement
    }
    // Click-to-move
    else if (this.targetPosition) {
      const direction = Vector2D.subtract(this.targetPosition, this.position);
      const distance = direction.magnitude();

      if (distance > 2) {
        const normalizedDirection = direction.normalize();
        const movement = normalizedDirection.scale(this.speed * delta);
        this.position = this.position.add(movement);
        
        // Clamp position to green field boundaries (accounting for border)
        const borderSize = 2; // Canvas border thickness
        const margin = this.radius + 5; // Add extra padding
        this.position.x = Math.max(borderSize + margin, Math.min(1200 - borderSize - margin, this.position.x));
        this.position.y = Math.max(borderSize + margin, Math.min(800 - borderSize - margin, this.position.y));
        
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