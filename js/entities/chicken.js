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
    const jumpHeld = this.input.isDown("jump");
    const inputX = (this.input.isDown("right") ? 1 : 0) - (this.input.isDown("left") ? 1 : 0);
    const inputY = (this.input.isDown("down") ? 1 : 0) - (this.input.isDown("up") ? 1 : 0);

    this.velocityX = inputX * this.speed;
    if (inputX !== 0) this.facingRight = inputX > 0;

    if (this.isJumping) {
      // while airborne, only gravity affects Y — no walking input
      if (jumpHeld && this.velocityY < 0 && this.jumpHoldFrames < this.maxJumpHoldFrames) {
        this.velocityY += this.jumpHoldBoost;
        this.jumpHoldFrames++;
      }
      this.velocityY += this.gravity;
    } else {
      // free Y movement on the ground
      this.velocityY = inputY * this.speedY;

      // jump
      if (jumpHeld) {
        this.velocityY = this.jumpForce;
        this.isJumping = true;
        this.jumpHoldFrames = 0;
      } else if (inputX !== 0 && inputY !== 0) {
        // keep diagonal movement at the same total speed as horizontal movement
        const magnitude = Math.hypot(this.velocityX, this.velocityY);
        if (magnitude > 0) {
          const scale = this.speed / magnitude;
          this.velocityX *= scale;
          this.velocityY *= scale;
        }
      }
    }

    this.isMoving = this.velocityX !== 0 || this.velocityY !== 0;
    if (!this.isMoving) this.currentFrame = 0;

    // cluck
    const cluckSound = (this.assets.spriteSets[this.spriteSetName] || this.assets.sprites).cluckSound;
    if (this.input.isDown("cluck") && !this.isClucking && cluckSound) {
      this.isClucking = true;
      this.cluckFrame = 0;
      this.cluckTimer = 0;
      cluckSound.currentTime = 0;
      cluckSound.play().catch(() => {});
    }

    if (this.isClucking) {
      if (!cluckSound || cluckSound.ended || cluckSound.paused) {
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

    if (this.isJumping) {
      this.airY += this.velocityY;
      if (this.airY >= 0) {
        this.airY = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.jumpHoldFrames = 0;
      }
    } else {
      this.y += this.velocityY;
    }

    if (this.x < 0) this.x = 0;
    if (this.x > this.bounds.width - this.width) this.x = this.bounds.width - this.width;
    if (this.y < this.minY) this.y = this.minY;
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
