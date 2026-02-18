import { TINT_COLORS, drawTintedSprite } from "./tints.js";

export class Chicken {
  /**
   * @param {import('../engine/input.js').InputManager} input
   * @param {{sprites: Object, sounds: Object}} assets
   * @param {{width: number, height: number}} bounds
   */
  constructor(input, assets, bounds) {
    this.input = input;
    this.assets = assets;
    this.bounds = bounds;

    // position & physics
    this.x = 400;
    this.width = 48;
    this.height = 48;
    this.groundY = 328;
    this.y = this.groundY;
    this.speed = 3;
    this.velocityX = 0;
    this.velocityY = 0;
    this.jumpForce = -8;
    this.gravity = 0.4;
    this.isJumping = false;

    // direction & movement
    this.facingRight = true;
    this.isMoving = false;

    // run animation
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.frameDelay = 4;

    // cluck animation
    this.isClucking = false;
    this.cluckFrame = 0;
    this.cluckTimer = 0;
    this.cluckDelay = 6;
    this.cluckFrames = 4;

    // tint (set via setColorIndex)
    this.tint = null;
  }

  /** @param {number} colorIndex */
  setColorIndex(colorIndex) {
    this.tint = TINT_COLORS[colorIndex % TINT_COLORS.length];
  }

  /** @param {number} dt */
  update(dt) {
    // horizontal movement
    this.velocityX = 0;

    if (this.input.isDown("ArrowLeft") || this.input.isDown("a") || this.input.isDown("A")) {
      this.velocityX = -this.speed;
      this.facingRight = false;
      this.isMoving = true;
    }
    if (this.input.isDown("ArrowRight") || this.input.isDown("d") || this.input.isDown("D")) {
      this.velocityX = this.speed;
      this.facingRight = true;
      this.isMoving = true;
    }

    if (this.velocityX === 0) {
      this.isMoving = false;
      this.currentFrame = 0;
    }

    // cluck
    if (this.input.isDown("v") && !this.isClucking && !this.isJumping) {
      this.isClucking = true;
      this.cluckFrame = 0;
      this.cluckTimer = 0;
      this.assets.sounds.cluck.currentTime = 0;
      this.assets.sounds.cluck.play().catch(() => {});
    }

    if (this.isClucking) {
      this.cluckTimer++;
      if (this.cluckTimer >= this.cluckDelay) {
        this.cluckTimer = 0;
        this.cluckFrame++;
        if (this.cluckFrame >= this.cluckFrames) {
          this.isClucking = false;
        }
      }
    }

    // jump
    if (this.input.isDown(" ") && !this.isJumping) {
      this.velocityY = this.jumpForce;
      this.isJumping = true;
    }

    // gravity
    this.velocityY += this.gravity;
    this.y += this.velocityY;

    // land on ground
    if (this.y >= this.groundY) {
      this.y = this.groundY;
      this.velocityY = 0;
      this.isJumping = false;
    }

    // move and clamp to screen
    this.x += this.velocityX;
    if (this.x < 0) this.x = 0;
    if (this.x > this.bounds.width - this.width) {
      this.x = this.bounds.width - this.width;
    }

    // run animation frames
    if (this.isMoving) {
      this.frameTimer++;
      if (this.frameTimer >= this.frameDelay) {
        this.frameTimer = 0;
        this.currentFrame = (this.currentFrame + 1) % 2;
      }
    }
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

    drawTintedSprite(ctx, sprite, frameX, spriteWidth, spriteHeight, this.x, this.y, drawWidth, drawHeight, this.facingRight, this.tint);
  }
}
