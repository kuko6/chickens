import { BaseChicken } from "./base-chicken.js";

/**
 * A chicken driven by network state instead of local input.
 * Rendered with reduced opacity and a server-assigned color tint.
 */
export class RemoteChicken extends BaseChicken {
  constructor(assets, colorIndex = 0, spriteSet = "default", name = "") {
    super(assets);
    this.opacity = 0.9;
    this.setColorIndex(colorIndex);
    if (spriteSet) this.setSpriteSet(spriteSet);
    this.name = name;
  }

  /** Apply state received from the network */
  applyState(state) {
    this.x = state.x;
    this.y = state.y;
    this.airY = state.airY || 0;
    this.facingRight = state.facingRight;
    this.isMoving = state.isMoving;
    this.isJumping = state.isJumping;
    this.isClucking = state.isClucking;
    this.currentFrame = state.currentFrame;
    this.cluckFrame = state.cluckFrame;
    if (state.spriteSet && state.spriteSet !== this.spriteSetName) {
      this.setSpriteSet(state.spriteSet);
    }
  }
}
