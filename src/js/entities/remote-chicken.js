import { BaseChicken } from "./base-chicken.js";

/** Interpolation speed — higher = snappier, 1.0 = instant. */
const LERP_SPEED = 0.30;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

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

    // interpolation targets
    this.targetX = this.x;
    this.targetY = this.y;
    this.targetAirY = 0;
    this.hasReceivedState = false;
  }

  /**
   * Apply state received from the network (using short keys).
   * Sets interpolation targets for position; discrete states are applied immediately.
   * Snaps to position on the first received state to avoid flying across the screen.
   * @param {Object} state
   */
  applyState(state) {
    if (state.dead) {
      this.dead = true;
      return;
    }

    // snap on first state so the chicken doesn't lerp from (0,0)
    if (!this.hasReceivedState) {
      this.hasReceivedState = true;
      this.x = state.x;
      this.y = state.y;
      this.airY = state.a || 0;
    }

    // set interpolation targets
    this.targetX = state.x;
    this.targetY = state.y;
    this.targetAirY = state.a || 0;

    // discrete states — apply immediately
    this.facingRight = state.f;
    this.isMoving = state.m;
    this.isJumping = state.j;
    this.isGliding = state.g;

    // play cluck sound when remote chicken starts clucking
    if (state.c && !this.isClucking) {
      const set = this.assets.spriteSets[this.spriteSetName];
      if (set.cluckSound) {
        set.cluckSound.currentTime = 0;
        set.cluckSound.play().catch(() => { });
      }
    }

    this.isClucking = state.c;
    this.currentFrame = state.fr;
    this.cluckFrame = state.cf;
  }

  /** Interpolate position towards the latest network target. */
  interpolate() {
    this.x = lerp(this.x, this.targetX, LERP_SPEED);
    this.y = lerp(this.y, this.targetY, LERP_SPEED);
    this.airY = lerp(this.airY, this.targetAirY, LERP_SPEED);
  }
}
