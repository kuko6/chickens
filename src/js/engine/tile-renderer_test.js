import { createTileRenderer } from "./tile-renderer.js";

Deno.test("tiles share whole-pixel edges at fractional scales and camera offsets", () => {
  for (const scale of [0.45, 0.8, 1, 1.25, 1.33375, 1.8, 2, 3.6]) {
    for (const cameraX of [-53.5, 0, 0.5, 47.9, 800.25]) {
      const rectangles = [];
      const ctx = {
        getTransform: () => ({ a: scale, d: scale + 0.00125, e: 0.25, f: -0.5 }),
        setTransform(...matrix) {
          if (matrix.join() !== "1,0,0,1,0,0") throw Error("Expected pixel coordinates");
        },
        drawImage(_image, _sx, _sy, _sw, _sh, ...rect) { rectangles.push(rect); },
      };
      const drawTile = createTileRenderer(ctx);
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 20; col++) {
          drawTile({}, 0, 0, 16, Math.round(col * 48 - cameraX), 208 + row * 48, 48);
        }
      }
      rectangles.forEach(([x, y, width, height], index) => {
        if (![x, y, width, height].every(Number.isInteger) || width <= 0 || height <= 0) {
          throw Error("Tile boundaries must be whole backing-store pixels");
        }
        if (index % 20 < 19 && x + width !== rectangles[index + 1][0]) {
          throw Error("Horizontal seam or overlap");
        }
        if (index < 60 && y + height !== rectangles[index + 20][1]) {
          throw Error("Vertical seam or overlap");
        }
      });
    }
  }
});
