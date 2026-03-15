/**
 * Fence obstacle built from a tileset (16x64: 4 tiles of 16x16 stacked).
 * Tile 0 = top edge, tiles 1-2 = random middle, tile 3 = bottom edge.
 * Spans the full ground height as a single column.
 */
export class Obstacle {
  /**
   * @param {number} x — world x position
   * @param {number} y — top y position (horizonY)
   * @param {HTMLImageElement} tileset — fence tileset (16x64)
   * @param {number} rows — number of tile rows to fill
   * @param {number} scale — tile scale (matches ground)
   * @param {number} tileSize — base tile size (16)
   * @param {number[]} middleTiles — pre-rolled tile indices (1 or 2) for each middle row
   */
  constructor(x, y, tileset, rows, scale, tileSize, middleTiles) {
    this.x = x;
    this.y = y;
    this.tileset = tileset;
    this.rows = rows;
    this.scale = scale;
    this.tileSize = tileSize;
    this.drawSize = tileSize * scale;
    this.width = this.drawSize;
    this.height = rows * this.drawSize;
    this.middleTiles = middleTiles;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cameraX
   */
  render(ctx, cameraX) {
    const screenX = Math.round(this.x - cameraX);
    const { tileset, tileSize, drawSize, rows } = this;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let row = 0; row < rows; row++) {
      let tileIdx;
      if (row === 0) {
        tileIdx = 0; // top edge
      } else if (row === rows - 1) {
        tileIdx = 3; // bottom edge
      } else {
        tileIdx = this.middleTiles[row - 1]; // random middle (1 or 2)
      }

      ctx.drawImage(
        tileset,
        tileIdx * tileSize, 0, tileSize, tileSize,
        screenX, this.y + row * drawSize, drawSize, drawSize,
      );
    }
    ctx.restore();
  }

  /**
   * AABB collision check against a chicken.
   * Jumping (airY < threshold) clears the obstacle.
   */
  collides(chicken) {
    if (chicken.airY < -10) return false;

    const cx = chicken.x;
    const cy = chicken.y + chicken.airY;
    const cw = chicken.width;
    const ch = chicken.height;

    return (
      cx < this.x + this.width &&
      cx + cw > this.x &&
      cy < this.y + this.height &&
      cy + ch > this.y
    );
  }
}
