import { BaseChicken } from "./base-chicken.js";

/**
 * A chicken driven by network state instead of local input.
 * Rendered with reduced opacity and a server-assigned color tint.
 */
export class RemoteChicken extends BaseChicken {
  constructor(assets, colorIndex = 0) {
    super(assets);
    this.opacity = 0.8;
    this.setColorIndex(colorIndex);
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
}
