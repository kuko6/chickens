import { TINT_COLORS, drawTintedSprite } from "./tints.js";

export class BaseChicken {
  constructor(assets) {
    this.assets = assets;

    this.x = 400;
    this.y = 320;
    this.width = 60;
    this.height = 60;

    this.facingRight = true;
    this.isMoving = false;
    this.isJumping = false;
    this.isClucking = false;

    this.currentFrame = 0;
    this.cluckFrame = 0;

    this.tint = null;
    this.opacity = 1;

    // depth bounds for parallax scaling
    this.minY = 210;
    this.maxY = 346;
  }

  /** @param {number} colorIndex */
  setColorIndex(colorIndex) {
    this.tint = TINT_COLORS[colorIndex % TINT_COLORS.length];
  }

  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {
    let sprite, spriteWidth, spriteHeight, frameX;

    if (this.isJumping) {
      sprite = this.assets.sprites.jump;
      spriteWidth = 20;
      spriteHeight = 20;
      frameX = 0;
    } else if (this.isMoving) {
      sprite = this.assets.sprites.run;
      spriteWidth = 20;
      spriteHeight = 20;
      frameX = this.currentFrame * spriteWidth;
    } else {
      sprite = this.assets.sprites.idle;
      spriteWidth = 20;
      spriteHeight = 20;
      frameX = 0;
    }

    const drawWidth = this.width * (spriteWidth / 20);
    const drawHeight = this.height;

    drawTintedSprite(ctx, sprite, frameX, spriteWidth, spriteHeight, this.x, this.y, drawWidth, drawHeight, this.facingRight, this.tint, this.opacity);

    // cluck bubble — decorative only, excluded from collision
    if (this.isClucking) {
      const cluckingSprite = this.assets.sprites.cluck;
      const cluckingSize = 18;
      const cluckingFrameX = this.cluckFrame * cluckingSize;
      const cluckingDraw = this.width;
      const cluckingX = this.facingRight
        ? this.x + drawWidth
        : this.x - cluckingDraw;

      drawTintedSprite(ctx, cluckingSprite, cluckingFrameX, cluckingSize, cluckingSize, cluckingX, this.y, cluckingDraw, cluckingDraw, this.facingRight, null, this.opacity);
    }
  }
}
