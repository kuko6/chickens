/**
 * Start a tile pass inside ctx.save()/restore(). Snap shared tile boundaries
 * to backing-store pixels: whole logical pixels can still land between pixels
 * after viewport scaling. Rounding both edges keeps adjacent tiles touching.
 * The game camera uses translation and positive, axis-aligned scaling only.
 * @param {CanvasRenderingContext2D} ctx
 */
export function createTileRenderer(ctx) {
  const { a, d, e, f } = ctx.getTransform();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;

  return (image, sourceX, sourceY, tileSize, x, y, size) => {
    const left = Math.round(x * a + e);
    const top = Math.round(y * d + f);
    const right = Math.round((x + size) * a + e);
    const bottom = Math.round((y + size) * d + f);
    ctx.drawImage(
      image, sourceX, sourceY, tileSize, tileSize,
      left, top, right - left, bottom - top,
    );
  };
}
