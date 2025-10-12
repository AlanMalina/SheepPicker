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
          const targetSize = 40;
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
    let targetX: number;
    let targetY: number;
    let attempts = 0;
    const maxAttempts = 50;
    
    // Keep trying to find a patrol target that's not in the yard
    do {
      targetX = Math.random() * 1100 + 50;
      targetY = Math.random() * 700 + 50;
      attempts++;
    } while (this.isPositionInYard(targetX, targetY) && attempts < maxAttempts);
    
    // If no valid position found, patrol near current position
    if (attempts >= maxAttempts) {
      targetX = this.position.x + (Math.random() * 200 - 100);
      targetY = this.position.y + (Math.random() * 200 - 100);
      // Clamp to field bounds
      targetX = Math.max(50, Math.min(1150, targetX));
      targetY = Math.max(50, Math.min(750, targetY));
    }
    
    this.patrolTarget = new Vector2D(targetX, targetY);
    this.patrolWaitTime = Math.random() * 60 + 30;
  }

  private setNewPatrolTargetAwayFromYard(): void {
    // Find a target that's definitely away from the yard
    const yardCenterX = 500 + 150; // 650
    const yardCenterY = 350 + 70;  // 420
    
    let targetX: number;
    let targetY: number;
    
    // Move in opposite direction from yard center
    const directionX = this.position.x - yardCenterX;
    const directionY = this.position.y - yardCenterY;
    const distance = Math.sqrt(directionX * directionX + directionY * directionY);
    
    if (distance > 0) {
      // Normalize and move away
      const normalizedX = directionX / distance;
      const normalizedY = directionY / distance;
      
      // Move at least 200 pixels away from yard
      targetX = this.position.x + normalizedX * 200;
      targetY = this.position.y + normalizedY * 200;
    } else {
      // If somehow at exact center, pick random direction away
      const angle = Math.random() * Math.PI * 2;
      targetX = this.position.x + Math.cos(angle) * 200;
      targetY = this.position.y + Math.sin(angle) * 200;
    }
    
    // Clamp to field bounds
    targetX = Math.max(50, Math.min(1150, targetX));
    targetY = Math.max(50, Math.min(750, targetY));
    
    this.patrolTarget = new Vector2D(targetX, targetY);
    this.patrolWaitTime = 0; // No wait time, move immediately
  }

  private isPositionInYard(x: number, y: number): boolean {
    // Yard position: (500, 350), size: 300x140
    const margin = 20;
    return (
      x >= 500 - margin &&
      x <= 500 + 300 + margin &&
      y >= 350 - margin &&
      y <= 350 + 140 + margin
    );
  }

  private isNearBorder(): boolean {
    // Check if animal is within 50 pixels of any border
    const borderThreshold = 50;
    const borderSize = 2;
    const margin = this.radius + 5;
    
    const minX = borderSize + margin;
    const maxX = 1200 - borderSize - margin;
    const minY = borderSize + margin;
    const maxY = 800 - borderSize - margin - 200;
    
    return (
      this.position.x < minX + borderThreshold ||
      this.position.x > maxX - borderThreshold ||
      this.position.y < minY + borderThreshold ||
      this.position.y > maxY - borderThreshold
    );
  }

  private setNewPatrolTargetAwayFromBorders(): void {
    // Calculate direction away from nearest border
    const borderSize = 2;
    const margin = this.radius + 5;
    
    const minX = borderSize + margin;
    const maxX = 1200 - borderSize - margin;
    const minY = borderSize + margin;
    const maxY = 800 - borderSize - margin - 200;
    
    let targetX = this.position.x;
    let targetY = this.position.y;
    
    // Check each border and move away from the nearest one(s)
    const distToLeft = this.position.x - minX;
    const distToRight = maxX - this.position.x;
    const distToTop = this.position.y - minY;
    const distToBottom = maxY - this.position.y;
    
    const threshold = 50;
    
    // Move away from left border
    if (distToLeft < threshold) {
      targetX = this.position.x + 200; // Move right
    }
    
    // Move away from right border
    if (distToRight < threshold) {
      targetX = this.position.x - 200; // Move left
    }
    
    // Move away from top border
    if (distToTop < threshold) {
      targetY = this.position.y + 200; // Move down
    }
    
    // Move away from bottom border
    if (distToBottom < threshold) {
      targetY = this.position.y - 200; // Move up
    }
    
    // Clamp to field bounds
    targetX = Math.max(100, Math.min(1100, targetX));
    targetY = Math.max(100, Math.min(500, targetY));
    
    this.patrolTarget = new Vector2D(targetX, targetY);
    this.patrolWaitTime = 0; // No wait time, move immediately
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

    // If currently near/in yard while patrolling, immediately get new target away from yard
    if (this.isPositionInYard(this.position.x, this.position.y)) {
      this.setNewPatrolTargetAwayFromYard();
      this.patrolWaitTime = 0; // No wait, move immediately
    }

    if (this.patrolTarget) {
      const direction = Vector2D.subtract(this.patrolTarget, this.position);
      const distance = direction.magnitude();

      if (distance > 2) {
        const normalizedDirection = direction.normalize();
        const movement = normalizedDirection.scale(this.speed * 0.5 * delta);
        const newPosition = this.position.add(movement);
        
        // Check if new position would be in yard - if so, find new patrol target away from yard
        if (this.isPositionInYard(newPosition.x, newPosition.y)) {
          this.setNewPatrolTargetAwayFromYard();
          return;
        }
        
        this.position = newPosition;
        
        // Clamp position to green field boundaries
        const borderSize = 2;
        const margin = this.radius + 5;
        this.position.x = Math.max(borderSize + margin, Math.min(1200 - borderSize - margin, this.position.x));
        this.position.y = Math.max(borderSize + margin, Math.min(800 - borderSize - margin - 200, this.position.y));
        
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
      
      // Clamp position to green field boundaries
      const borderSize = 2;
      const margin = this.radius + 5;
      this.position.x = Math.max(borderSize + margin, Math.min(1200 - borderSize - margin, this.position.x));
      this.position.y = Math.max(borderSize + margin, Math.min(800 - borderSize - margin - 200, this.position.y));
      
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