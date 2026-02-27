import { BaseChicken } from "./base-chicken.js";

export class Chicken extends BaseChicken {
  /**
   * @param {import('../engine/input.js').InputManager} input
   * @param {{sprites: Object, sounds: Object}} assets
   * @param {{width: number, height: number}} bounds
   */
  constructor(input, assets, bounds) {
    super(assets);
    this.input = input;
    this.bounds = bounds;

    // movement
    this.speed = 4;
    this.speedY = 3;
    this.velocityX = 0;
    this.velocityY = 0;
    this.minY = 200;
    this.maxY = bounds.height - this.height;

    // jump / gravity
    this.groundY = null;
    this.jumpForce = -8;
    this.gravity = 0.4;
    this.jumpHoldFrames = 0;
    this.maxJumpHoldFrames = 7;
    this.jumpHoldBoost = -0.2;

    // start centered in the walkable area
    this.x = (this.bounds.width - this.width) / 2;
    this.y = (this.minY + this.maxY) / 2;

    // run animation
    this.frameTimer = 0;
    this.frameDelay = 4;

    // cluck animation
    this.cluckTimer = 0;
    this.cluckDelay = 8;
    this.cluckFrames = 4;
  }

  /** @param {number} dt */
  update(dt) {
    const jumpHeld = this.input.isDown(" ");

    this.velocityX = 0;

    if (this.input.isDown("ArrowLeft") || this.input.isDown("a") || this.input.isDown("A")) {
      this.velocityX = -this.speed;
      this.facingRight = false;
    }
    if (this.input.isDown("ArrowRight") || this.input.isDown("d") || this.input.isDown("D")) {
      this.velocityX = this.speed;
      this.facingRight = true;
    }

    if (this.isJumping) {
      // while airborne, only gravity affects Y — no walking input
      if (jumpHeld && this.velocityY < 0 && this.jumpHoldFrames < this.maxJumpHoldFrames) {
        this.velocityY += this.jumpHoldBoost;
        this.jumpHoldFrames++;
      }
      this.velocityY += this.gravity;
    } else {
      // free Y movement on the ground
      this.velocityY = 0;
      if (this.input.isDown("ArrowUp") || this.input.isDown("w") || this.input.isDown("W")) {
        this.velocityY = -this.speedY;
      }
      if (this.input.isDown("ArrowDown") || this.input.isDown("s") || this.input.isDown("S")) {
        this.velocityY = this.speedY;
      }

      // jump — snap groundY to current position
      if (jumpHeld) {
        this.groundY = this.y;
        this.velocityY = this.jumpForce;
        this.isJumping = true;
        this.jumpHoldFrames = 0;
      }
    }

    this.isMoving = this.velocityX !== 0 || this.velocityY !== 0;
    if (!this.isMoving) this.currentFrame = 0;

    // cluck
    if (this.input.isDown("v") && !this.isClucking) {
      this.isClucking = true;
      this.cluckFrame = 0;
      this.cluckTimer = 0;
      this.assets.sounds.cluck.currentTime = 0;
      this.assets.sounds.cluck.play().catch(() => {});
    }

    if (this.isClucking) {
      const sound = this.assets.sounds.cluck;
      if (sound.ended || sound.paused) {
        this.isClucking = false;
        this.cluckFrame = 0;
      } else {
        this.cluckTimer++;
        if (this.cluckTimer >= this.cluckDelay) {
          this.cluckTimer = 0;
          this.cluckFrame = (this.cluckFrame + 1) % this.cluckFrames;
        }
      }
    }

    // move and clamp
    this.x += this.velocityX;
    this.y += this.velocityY;

    if (this.x < 0) this.x = 0;
    if (this.x > this.bounds.width - this.width) this.x = this.bounds.width - this.width;
    if (!this.isJumping && this.y < this.minY) this.y = this.minY;
    if (this.isJumping && this.y >= this.groundY) {
      this.y = this.groundY;
      this.velocityY = 0;
      this.isJumping = false;
      this.groundY = null;
      this.jumpHoldFrames = 0;
    }
    if (this.y > this.maxY) this.y = this.maxY;

    // run animation frames
    if (this.isMoving) {
      this.frameTimer++;
      if (this.frameTimer >= this.frameDelay) {
        this.frameTimer = 0;
        this.currentFrame = (this.currentFrame + 1) % 2;
      }
    }
  }
}
