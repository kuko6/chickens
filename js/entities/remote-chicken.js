import { TINT_COLORS, drawTintedSprite } from "./tints.js";

/**
 * A chicken driven by network state instead of local input.
 * Rendered with reduced opacity and a server-assigned color tint.
 */
export class RemoteChicken {
  constructor(assets, colorIndex = 0) {
    this.assets = assets;
    this.x = 400;
    this.y = 328;
    this.width = 48;
    this.height = 48;
    this.facingRight = true;
    this.isMoving = false;
    this.isJumping = false;
    this.isClucking = false;
    this.currentFrame = 0;
    this.cluckFrame = 0;
    this.tint = TINT_COLORS[colorIndex % TINT_COLORS.length];
  }

  /** Apply state received from the network */
  applyState(state) {
    this.x = state.x;
    this.y = state.y;
    this.facingRight = state.facingRight;
    this.isMoving = state.isMoving;
    this.isJumping = state.isJumping;
    this.isClucking = state.isClucking;
    this.currentFrame = state.currentFrame;
    this.cluckFrame = state.cluckFrame;
  }

  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {
    let sprite, spriteWidth, spriteHeight, frameX;

    if (this.isJumping) {
      sprite = this.assets.sprites.jump;
      spriteWidth = 16;
      spriteHeight = 16;
      frameX = 0;
    } else if (this.isClucking) {
      sprite = this.assets.sprites.cluck;
      spriteWidth = 21;
      spriteHeight = 16;
      frameX = this.cluckFrame * spriteWidth;
    } else if (this.isMoving) {
      sprite = this.assets.sprites.run;
      spriteWidth = 16;
      spriteHeight = 16;
      frameX = this.currentFrame * spriteWidth;
    } else {
      sprite = this.assets.sprites.idle;
      spriteWidth = 16;
      spriteHeight = 16;
      frameX = 0;
    }

    const drawWidth = this.width * (spriteWidth / 16);
    const drawHeight = this.height;

    drawTintedSprite(ctx, sprite, frameX, spriteWidth, spriteHeight, this.x, this.y, drawWidth, drawHeight, this.facingRight, this.tint, 0.7);
  }
}
