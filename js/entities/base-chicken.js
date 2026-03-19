import { TINT_COLORS, drawTintedSprite } from "./tints.js";

export class BaseChicken {
  constructor(assets) {
    this.assets = assets;

    this.x = 400;
    this.y = 320;
    this.airY = 0;

    this.spriteSetName = "imro";
    this.spriteWidth = 20;
    this.spriteHeight = 20;
    this.width = this.spriteWidth * 3;
    this.height = this.spriteHeight * 3;

    this.facingRight = true;
    this.isMoving = false;
    this.isJumping = false;
    this.isGliding = false;
    this.isClucking = false;

    this.currentFrame = 0;
    this.cluckFrame = 0;

    this.tint = null;
    this.opacity = 1;
    this.name = "";

    // depth bounds for parallax scaling
    this.minY = 210;
    this.maxY = 346;
  }

  /** @param {string} name */
  setSpriteSet(name) {
    const set = this.assets.spriteSets[name];
    if (!set) return;
    this.spriteSetName = name;
    this.spriteWidth = set.spriteWidth;
    this.spriteHeight = set.spriteHeight;
    this.width = this.spriteWidth * 3;
    this.height = this.spriteHeight * 3;
  }

  /** @param {number} colorIndex */
  setColorIndex(colorIndex) {
    this.colorIndex = colorIndex;
    this.tint = TINT_COLORS[colorIndex % TINT_COLORS.length];
  }

  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {
    const set = this.assets.spriteSets[this.spriteSetName] || this.assets.sprites;
    let sprite, frameX;

    if (this.isGliding) {
      sprite = set.glide;
      frameX = this.currentFrame * this.spriteWidth;
    } else if (this.isJumping) {
      sprite = set.jump;
      frameX = 0;
    } else if (this.isMoving) {
      sprite = set.run;
      frameX = this.currentFrame * this.spriteWidth;
    } else {
      sprite = set.idle;
      frameX = 0;
    }

    const drawWidth = this.width;
    const drawHeight = this.height;
    const drawY = this.y + this.airY;

    drawTintedSprite(ctx, sprite, frameX, this.spriteWidth, this.spriteHeight, this.x, drawY, drawWidth, drawHeight, this.facingRight, this.tint, this.opacity);

    // cluck bubble — decorative only, excluded from collision
    if (this.isClucking) {
      const cluckSprite = set.cluck || this.assets.sprites.cluck;
      if (cluckSprite) {
        const cluckingSize = 18;
        const cluckingFrameX = this.cluckFrame * cluckingSize;
        const cluckingDraw = this.width;
        const cluckingX = this.facingRight
          ? this.x + drawWidth
          : this.x - cluckingDraw;

        drawTintedSprite(ctx, cluckSprite, cluckingFrameX, cluckingSize, cluckingSize, cluckingX, drawY, cluckingDraw, cluckingDraw, this.facingRight, null, this.opacity);
      }
    }

    // draw name above chicken
    if (this.name) {
      ctx.save();
      ctx.font = "bold 11px DepartureMono";
      ctx.textAlign = "center";

      const nameX = this.x + drawWidth / 2;
      const nameY = drawY - 6;
      const textWidth = ctx.measureText(this.name).width;
      const padding = 3;

      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(
        nameX - textWidth / 2 - padding,
        nameY - 10 - padding,
        textWidth + padding * 2,
        12 + padding * 2
      );

      ctx.fillStyle = "#ffffff";
      ctx.fillText(this.name, nameX, nameY);
      ctx.restore();
    }
  }
}
