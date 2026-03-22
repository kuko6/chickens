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
    this.minY = 176;
    this.maxY = bounds.height - this.height;

    // jump / gravity
    this.jumpForce = -10;
    this.gravity = 0.6;
    this.jumpHoldFrames = 0;
    this.maxJumpHoldFrames = 8;
    this.jumpHoldBoost = -0.4;

    // glide
    this.glideGravity = 0.15;
    this.glideMaxFallSpeed = 2;
    this.baseGlideFrames = 30;
    this.maxGlideFrames = this.baseGlideFrames;
    this.glideFrames = 0;
    this.gameSpeed = 0;

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

    // when true, chicken always faces right and plays run animation
    this.autoRun = false;
  }

  /**
   * Process input, apply physics (jump, glide, gravity), handle cluck sound,
   * and advance animation frames. dt is currently unused — movement is frame-based
   * at a fixed 60 FPS tick rate.
   * @param {number} dt
   */
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

      // glide: hold space while falling to slow descent
      // budget shrinks as game speed increases (3 → 20 maps to 100% → 30% of base)
      const speedFactor = 1 - 0.7 * Math.min((this.gameSpeed - 3) / 17, 1);
      this.maxGlideFrames = Math.round(this.baseGlideFrames * speedFactor);
      if (jumpHeld && this.velocityY > 0 && this.glideFrames < this.maxGlideFrames) {
        this.isGliding = true;
        this.glideFrames++;
        this.velocityY += this.glideGravity;
        if (this.velocityY > this.glideMaxFallSpeed) {
          this.velocityY = this.glideMaxFallSpeed;
        }
      } else {
        this.isGliding = false;
        this.velocityY += this.gravity;
      }
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

    if (this.autoRun) {
      this.facingRight = true;
      this.isMoving = true;
    } else {
      this.isMoving = this.velocityX !== 0 || this.velocityY !== 0;
      if (!this.isMoving) this.currentFrame = 0;
    }

    // cluck
    const cluckSound = this.assets.spriteSets[this.spriteSetName].cluckSound;
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
        this.isGliding = false;
        this.jumpHoldFrames = 0;
        this.glideFrames = 0;
      }
    } else {
      this.y += this.velocityY;
    }

    if (this.y < this.minY) this.y = this.minY;
    if (this.y > this.maxY) this.y = this.maxY;

    // run / glide animation frames
    if (this.isGliding || this.isMoving) {
      this.frameTimer++;
      if (this.frameTimer >= this.frameDelay) {
        this.frameTimer = 0;
        this.currentFrame = (this.currentFrame + 1) % 2;
      }
    }
  }
}
