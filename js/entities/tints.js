// Index 0 = no tint (base chicken), 1+ = colored
export const TINT_COLORS = [
  null,                         // base (no tint)
  // "rgba(0, 0, 0, 0.6)",         // black
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
const _tintCanvas = document.createElement("canvas");
const _tintCtx = _tintCanvas.getContext("2d");

export function drawTintedSprite(ctx, sprite, frameX, spriteWidth, spriteHeight, x, y, drawWidth, drawHeight, facingRight, tint, alpha = 1.0) {
  _tintCanvas.width = drawWidth;
  _tintCanvas.height = drawHeight;
  _tintCtx.clearRect(0, 0, drawWidth, drawHeight);
  _tintCtx.imageSmoothingEnabled = false;
  _tintCtx.drawImage(sprite, frameX, 0, spriteWidth, spriteHeight, 0, 0, drawWidth, drawHeight);

  if (tint) {
    _tintCtx.globalCompositeOperation = "source-atop";
    _tintCtx.fillStyle = tint;
    _tintCtx.fillRect(0, 0, drawWidth, drawHeight);
    _tintCtx.globalCompositeOperation = "source-over";
  }

  ctx.save();
  if (alpha < 1.0) ctx.globalAlpha = alpha;

  if (!facingRight) {
    ctx.translate(x + drawWidth, y);
    ctx.scale(-1, 1);
    ctx.drawImage(_tintCanvas, 0, 0);
  } else {
    ctx.drawImage(_tintCanvas, x, y);
  }

  ctx.restore();
}
