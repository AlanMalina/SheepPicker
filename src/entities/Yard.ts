import { Graphics } from 'pixi.js';
import { Vector2D } from '../utils/Vector2D';

export class Yard {
  private graphics: Graphics;
  private borderGraphics: Graphics;
  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private glowIntensity: number = 0;
  private glowDirection: number = 1;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.graphics = new Graphics();
    this.borderGraphics = new Graphics();
    this.draw();
  }

  private draw(): void {
    this.graphics.rect(this.x, this.y, this.width, this.height);
    this.graphics.fill(0xffff00);
  }

  private drawBorder(): void {
    this.borderGraphics.clear();
    
    if (this.glowIntensity > 0) {
      const alpha = this.glowIntensity;
      const glowSize = 3 + this.glowIntensity * 2;
      
      // Outer glow
      this.borderGraphics.rect(
        this.x - glowSize,
        this.y - glowSize,
        this.width + glowSize * 2,
        this.height + glowSize * 2
      );
      this.borderGraphics.stroke({ width: glowSize, color: 0xff6600, alpha: alpha * 0.8 });
      
      // Inner bright border
      this.borderGraphics.rect(this.x, this.y, this.width, this.height);
      this.borderGraphics.stroke({ width: 3, color: 0xffffff, alpha: alpha });
    }
  }

  public setHighlight(highlight: boolean, delta: number): void {
    if (highlight) {
      this.glowIntensity += this.glowDirection * 0.03 * delta;
      
      if (this.glowIntensity >= 1) {
        this.glowIntensity = 1;
        this.glowDirection = -1;
      } else if (this.glowIntensity <= 0.3) {
        this.glowIntensity = 0.3;
        this.glowDirection = 1;
      }
    } else {
      this.glowIntensity = Math.max(0, this.glowIntensity - 0.05 * delta);
    }
    
    this.drawBorder();
  }

  public contains(position: Vector2D): boolean {
    return (
      position.x >= this.x &&
      position.x <= this.x + this.width &&
      position.y >= this.y &&
      position.y <= this.y + this.height
    );
  }

  public getGraphics(): Graphics {
    return this.graphics;
  }

  public getBorderGraphics(): Graphics {
    return this.borderGraphics;
  }
}