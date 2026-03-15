import { BaseChicken } from "./base-chicken.js";

/**
 * A chicken driven by network state instead of local input.
 * Rendered with reduced opacity and a server-assigned color tint.
 */
export class RemoteChicken extends BaseChicken {
  constructor(assets, colorIndex = 0, spriteSet = "default", name = "") {
    super(assets);
    this.opacity = 0.9;
    this.dead = false;
    this.setColorIndex(colorIndex);
    if (spriteSet) this.setSpriteSet(spriteSet);
    this.name = name;
  }

  /** Apply state received from the network */
  applyState(state) {
    if (state.dead) {
      this.dead = true;
      return;
    }
    this.x = state.x;
    this.y = state.y;
    this.airY = state.airY || 0;
    this.facingRight = state.facingRight;
    this.isMoving = state.isMoving;
    this.isJumping = state.isJumping;

    // play cluck sound when remote chicken starts clucking
    if (state.isClucking && !this.isClucking) {
      const set = this.assets.spriteSets[this.spriteSetName] || this.assets.sprites;
      if (set.cluckSound) {
        set.cluckSound.currentTime = 0;
        set.cluckSound.play().catch(() => {});
      }
    }

    this.isClucking = state.isClucking;
    this.currentFrame = state.currentFrame;
    this.cluckFrame = state.cluckFrame;
    if (state.spriteSet && state.spriteSet !== this.spriteSetName) {
      this.setSpriteSet(state.spriteSet);
    }
  }
}
