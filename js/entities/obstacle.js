/**
 * Fence obstacle built from a tileset (16x64: 4 tiles of 16x16 stacked).
 * Tile 0 = top edge, tiles 1-2 = random middle, tile 3 = bottom edge.
 * Supports multiple vertical segments for variant obstacles (holes, short fences).
 */
export class Obstacle {
  /**
   * @param {number} x — world x position
   * @param {number} y — top y position (horizonY)
   * @param {HTMLImageElement} tileset — fence tileset (16x64)
   * @param {number} scale — tile scale (matches ground)
   * @param {number} tileSize — base tile size (16)
   * @param {{ startRow: number, tiles: number[] }[]} segments — vertical segments
   */
  constructor(x, y, tileset, scale, tileSize, segments) {
    this.x = x;
    this.y = y;
    this.tileset = tileset;
    this.scale = scale;
    this.tileSize = tileSize;
    this.drawSize = tileSize * scale;
    this.width = this.drawSize;
    this.segments = segments;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cameraX
   */
  render(ctx, cameraX) {
    const screenX = Math.round(this.x - cameraX);
    const { tileset, tileSize, drawSize } = this;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const seg of this.segments) {
      for (let i = 0; i < seg.tiles.length; i++) {
        const tileIdx = seg.tiles[i];
        ctx.drawImage(
          tileset,
          tileIdx * tileSize, 0, tileSize, tileSize,
          screenX, this.y + (seg.startRow + i) * drawSize, drawSize, drawSize,
        );
      }
    }
    ctx.restore();
  }

  /**
   * AABB collision check against a chicken.
   * Checks each segment independently — gaps between segments are passable.
   * @param {import('../entities/chicken.js').Chicken} chicken
   */
  collides(chicken) {
    if (chicken.airY < -10) return false;

    // shrink hitboxes — chicken head is more forgiving, obstacle bottom edge too
    const padX = 6;
    const chickenTopPad = 16;  // more forgiving head
    const chickenBottomPad = 4;
    const cx = chicken.x + padX;
    const cy = chicken.y + chicken.airY + chickenTopPad;
    const cw = chicken.width - padX * 2;
    const ch = chicken.height - chickenTopPad - chickenBottomPad;

    // horizontal overlap is shared across all segments
    if (cx >= this.x + this.width - padX || cx + cw <= this.x + padX) return false;

    const obsPadBottom = 14; // forgiving bottom edge of obstacle segments
    for (const seg of this.segments) {
      const segY = this.y + seg.startRow * this.drawSize;
      const segH = seg.tiles.length * this.drawSize - obsPadBottom;
      if (cy < segY + segH && cy + ch > segY) return true;
    }
    return false;
  }
}
