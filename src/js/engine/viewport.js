/**
 * Scale the canvas and its HTML overlays in the same logical coordinate space.
 * The world stays 800 × 400 so resizing cannot change multiplayer physics or
 * obstacle generation. Only presentation and backing-store resolution change.
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 */
export function configureViewport(canvas, ctx) {
  const stage = canvas.parentElement;
  const host = stage.parentElement;
  const viewport = { width: canvas.width, height: canvas.height, dpr: 1 };
  stage.style.width = `${viewport.width}px`;
  stage.style.height = `${viewport.height}px`;
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  const resize = () => {
    const scale = host.clientWidth / viewport.width;
    if (scale <= 0) return;
    stage.style.transform = `scale(${scale})`;
    viewport.dpr = window.devicePixelRatio || 1;
    const pixelScale = scale * viewport.dpr;
    const width = Math.max(1, Math.round(viewport.width * pixelScale));
    const height = Math.max(1, Math.round(viewport.height * pixelScale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(width / viewport.width, 0, 0, height / viewport.height, 0, 0);
  };

  new ResizeObserver(resize).observe(host);
  window.addEventListener("resize", resize);

  // Zooming or moving between displays can change DPR without a layout resize.
  let resolutionQuery;
  const watchResolution = () => {
    resolutionQuery?.removeEventListener("change", watchResolution);
    resize();
    resolutionQuery = window.matchMedia(`(resolution: ${viewport.dpr}dppx)`);
    resolutionQuery.addEventListener("change", watchResolution);
  };
  watchResolution();
  return viewport;
}
