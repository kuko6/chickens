import { Cloud } from "../entities/cloud.js";

const WIDTH_MULT = 4
const CLOUD_SPACING = 150;
const SKIP_MODULO = 5;
const X_JITTER_MAX = 100;
const Y_MAX = 125;

/**
 * Clouds are placed on a repeating strip (canvasW * WIDTH_MULT) that wraps seamlessly.
 * Each cloud's position is derived from rng.hash(layer, i) — a stateless hash seeded
 * by the server's mapSeed, so all clients see the same sky. The hash returns a 32-bit
 * integer; different bit ranges are shifted out (>> 8, >> 12) to produce independent
 * x-jitter and y values from a single call. Some slots are skipped (1 in SKIP_MODULO)
 * so clouds don't feel evenly spaced. Two layers with different parallax and drift
 * speeds create a sense of depth.
 */
export class CloudLayer {
  /**
   * @param {number} canvasW
   * @param {HTMLImageElement[]} cloudImages
   * @param {import('../engine/seeded-random.js').SeededRandom} rng
   */
  constructor(canvasW, cloudImages, rng) {
    this.canvasW = canvasW;
    this.stripWidth = canvasW * WIDTH_MULT;
    this.clouds = [[], []]; // [backLayer, frontLayer]
    this.drift = [0, 0];

    const count = Math.floor(this.stripWidth / CLOUD_SPACING);
    console.log(count)

    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < count; i++) {
        const h = rng.hash(layer, i);

        // skip some clouds for density variation
        if (h % SKIP_MODULO === 0) continue;

        const image = cloudImages[h % cloudImages.length];

        // shifted so we dont get the same number and the coordinates arent related
        const x = (i / count) * this.stripWidth + ((h >> 8) % X_JITTER_MAX);
        const y = (h >> 12) % Y_MAX;
        this.clouds[layer].push(new Cloud(image, x, y, layer));
      }
    }
  }

  update() {
    for (let layer = 0; layer < 2; layer++) {
      if (this.clouds[layer].length > 0) {
        this.drift[layer] -= this.clouds[layer][0].speed;
      }
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cameraX
   */
  render(ctx, cameraX) {
    const strip = this.stripWidth;
    for (let layer = 0; layer < 2; layer++) {
      const parallax =
        this.clouds[layer].length > 0 ? this.clouds[layer][0].parallax : 0;
      const offset = this.drift[layer] - cameraX * parallax;
      for (const cloud of this.clouds[layer]) {
        let screenX =
          (((cloud.x + offset) % strip) + strip) % strip - cloud.width;
        if (screenX < this.canvasW && screenX + cloud.width > -cloud.width) {
          cloud.render(ctx, screenX);
        }
      }
    }
  }
}
