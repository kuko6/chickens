import { TINT_COLORS, drawTintedSprite } from "./tints.js";

export class BaseChicken {
  constructor(assets) {
    this.assets = assets;

    this.x = 400;
    this.y = 320;
    this.width = 54;
    this.height = 54;

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
      spriteWidth = 18;
      spriteHeight = 18;
      frameX = 0;
    } else if (this.isClucking) {
      sprite = this.assets.sprites.cluck;
      spriteWidth = 21;
      spriteHeight = 18;
      frameX = this.cluckFrame * spriteWidth;
    } else if (this.isMoving) {
      sprite = this.assets.sprites.run;
      spriteWidth = 18;
      spriteHeight = 18;
      frameX = this.currentFrame * spriteWidth;
    } else {
      sprite = this.assets.sprites.idle;
      spriteWidth = 18;
      spriteHeight = 18;
      frameX = 0;
    }

    const drawWidth = this.width * (spriteWidth / 18);
    const drawHeight = this.height;

    drawTintedSprite(ctx, sprite, frameX, spriteWidth, spriteHeight, this.x, this.y, drawWidth, drawHeight, this.facingRight, this.tint, this.opacity);
  }
}
