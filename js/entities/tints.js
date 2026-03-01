// Index 0 = no tint (base chicken), 1+ = colored
export const TINT_COLORS = [
  null,                         // base (no tint)
  // "rgba(0, 0, 0, 0.7)",         // black
  "rgba(0, 100, 255, 0.4)",     // blue
  "rgba(255, 40, 40, 0.4)",     // red
  "rgba(40, 200, 40, 0.4)",     // green
  "rgba(255, 220, 0, 0.4)",     // yellow
  "rgba(255, 100, 200, 0.4)",   // pink
];

/**
 * Draw a sprite frame onto ctx with an optional color tint.
 * Uses an offscreen canvas for the tint compositing.
 */
const tintCanvas = document.createElement("canvas");
const tintCtx = tintCanvas.getContext("2d");

export function drawTintedSprite(ctx, sprite, frameX, spriteWidth, spriteHeight, x, y, drawWidth, drawHeight, facingRight, tint, alpha = 1.0) {
  tintCanvas.width = drawWidth;
  tintCanvas.height = drawHeight;
  tintCtx.clearRect(0, 0, drawWidth, drawHeight);
  tintCtx.imageSmoothingEnabled = false;
  tintCtx.drawImage(sprite, frameX, 0, spriteWidth, spriteHeight, 0, 0, drawWidth, drawHeight);

  if (tint) {
    tintCtx.globalCompositeOperation = "source-atop";
    tintCtx.fillStyle = tint;
    tintCtx.fillRect(0, 0, drawWidth, drawHeight);
    tintCtx.globalCompositeOperation = "source-over";
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (alpha < 1.0) ctx.globalAlpha = alpha;

  if (!facingRight) {
    ctx.translate(x + drawWidth, y);
    ctx.scale(-1, 1);
    ctx.drawImage(tintCanvas, 0, 0);
  } else {
    ctx.drawImage(tintCanvas, x, y);
  }

  ctx.restore();
}
