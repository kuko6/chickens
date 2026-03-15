export class Cloud {
  /**
   * @param {HTMLImageElement} image
   * @param {number} x       strip-space X
   * @param {number} y       screen-space Y
   * @param {number} layer   0 = back (far), 1 = front (near)
   */
  constructor(image, x, y, layer) {
    this.image = image;
    this.x = x;
    this.y = y;
    this.layer = layer;

    // parallax determine how fast the clouds move when the user moves
    if (layer === 0) {
      this.scale = 1.75;
      this.opacity = 0.3;
      this.parallax = 0.35;
      this.speed = 0.05;
    } else {
      this.scale = 2.5;
      this.opacity = 0.75;
      this.parallax = 0.45;
      this.speed = 0.15;
    }

    this.width = this.image.width * this.scale;
    this.height = this.image.height * this.scale;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} screenX  pre-computed wrapped screen position
   */
  render(ctx, screenX) {
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
