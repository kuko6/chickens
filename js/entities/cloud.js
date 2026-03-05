export class Cloud {
  /**
   * @param {HTMLImageElement} image
   * @param {number} x       world-space X
   * @param {number} y       screen-space Y
   * @param {number} depth   0 = far away, 1 = close
   */
  constructor(image, x, y, depth) {
    this.image = image;
    this.x = x;
    this.y = y;
    this.depth = depth;

    // depth drives scale and opacity — kept subtle
    this.scale = 1.25 + depth * 2.0;       // 1.25x .. 3.25x
    this.opacity = 0.45 + depth * 0.35;    // 0.45 .. 0.80
    // parallax: far clouds scroll slower
    this.parallax = 0.2 + depth * 0.3;     // 0.2 .. 0.5

    // slow drift
    this.speed = 0.05 + depth * 0.15;
    this.drift = 0;

    this.width = this.image.width * this.scale;
    this.height = this.image.height * this.scale;
  }

  update() {
    this.drift -= this.speed;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cameraX
   */
  render(ctx, cameraX) {
    const screenX = this.x + this.drift - cameraX * this.parallax;

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      this.image,
      Math.round(screenX),
      Math.round(this.y),
      Math.round(this.width),
      Math.round(this.height),
    );
    ctx.restore();
  }
}
