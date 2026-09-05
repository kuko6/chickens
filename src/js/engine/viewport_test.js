import { configureViewport } from "./viewport.js";

Deno.test("viewport keeps canvas, frame, and overlays aligned across resizes and DPR changes", () => {
  const originalWindow = globalThis.window;
  const originalObserver = globalThis.ResizeObserver;
  let onResize;
  let onResolutionChange;
  const host = {
    clientWidth: 965,
    style: {},
  };
  const stage = { style: {}, parentElement: host };
  const canvas = { width: 800, height: 400, style: {}, parentElement: stage };
  let matrix;
  const ctx = { setTransform: (...values) => { matrix = values; } };
  globalThis.window = {
    devicePixelRatio: 2,
    addEventListener() {},
    matchMedia: () => ({
      addEventListener: (_event, callback) => { onResolutionChange = callback; },
      removeEventListener() {},
    }),
  };
  globalThis.ResizeObserver = class {
    constructor(callback) { onResize = callback; }
    observe() {}
  };
  const assert = (condition, message) => {
    if (!condition) throw Error(message);
  };
  try {
    const viewport = configureViewport(canvas, ctx);
    for (const width of [965, 320, 801, 1200]) {
      host.clientWidth = width;
      onResize();
      for (const dpr of [1, 1.25, 2, 3]) {
        window.devicePixelRatio = dpr;
        onResolutionChange();
        assert(canvas.style.width === "800px" && canvas.style.height === "400px",
          "Canvas CSS dimensions must stay logical to avoid applying scale twice");
        assert(host.style.height === `${width / 2}px`, "Frame must match the scaled canvas height");
        assert(canvas.width === Math.round(width * dpr), "Backing width must match display resolution");
        assert(canvas.height === Math.round(width / 2 * dpr), "Backing height must match display resolution");
        assert(matrix[0] * 800 === canvas.width && matrix[3] * 400 === canvas.height,
          "Logical world must fill the backing store");
        assert(stage.style.transform === `scale(${width / 800})`, "Overlays must track canvas scale");
        assert(!host.style.transform && !canvas.style.transform, "Only the shared stage should be CSS transformed");
        assert(ctx.imageSmoothingEnabled === false, "Resizing must preserve pixel art sampling");
        assert(viewport.width === 800 && viewport.height === 400, "Resizing must not change world size");
      }
    }
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalObserver === undefined) delete globalThis.ResizeObserver;
    else globalThis.ResizeObserver = originalObserver;
  }
});
