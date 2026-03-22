export class BaseScene {
  constructor(context) {
    this.ctx = context.ctx;
    this.canvas = context.canvas;
    this.viewport = context.viewport;
    this.canvasW = this.viewport.width;
    this.canvasH = this.viewport.height;
    this.assets = context.assets;
    this.input = context.input;
    this.network = context.network;
    this.switchScene = context.switchScene;
    this.cloudLayer = context.cloudLayer;
    this.rng = context.rng;
    this.horizonY = context.horizonY;
    this.networkSync = context.networkSync;
    this.context = context;

    this.chicken = null;
    this.cameraX = 0;
    this.onKeyDown = null;
  }

  initGround() {
    this.tileSize = 16;
    this.tileScale = 3;
    this.drawSize = this.tileSize * this.tileScale;
    this.groundRows = (this.canvasH - this.horizonY) / this.drawSize;

    const { groundTileset, groundEdgeTileset } = this.assets.environment;
    this.edgeTileCount = groundEdgeTileset.width / this.tileSize;
    this.groundTileCount = groundTileset.width / this.tileSize;
  }

  renderBackground() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);
    this.cloudLayer.render(ctx, this.cameraX);
    this.renderGround(ctx);
  }

  renderGround(ctx) {
    const horizonY = this.horizonY;
    const { tileSize, drawSize, groundRows } = this;
    const { groundTileset, groundEdgeTileset } = this.assets.environment;

    const startCol = Math.floor(this.cameraX / drawSize);
    const visibleCols = Math.ceil(this.canvasW / drawSize) + 1;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let row = 0; row < groundRows; row++) {
      const isEdge = row === 0;
      const tileset = isEdge ? groundEdgeTileset : groundTileset;
      const tileCount = isEdge ? this.edgeTileCount : this.groundTileCount;
      for (let i = 0; i < visibleCols; i++) {
        const worldCol = startCol + i;
        const hash = this.rng.hash(worldCol, row);
        const tileIdx = hash % tileCount;
        const screenX = worldCol * drawSize - this.cameraX;
        ctx.drawImage(
          tileset,
          tileIdx * tileSize,
          0,
          tileSize,
          tileSize,
          Math.round(screenX),
          horizonY + row * drawSize,
          drawSize,
          drawSize,
        );
      }
    }
    ctx.restore();
  }

  renderChickens(chickens) {
    const ctx = this.ctx;
    chickens.sort((a, b) => a.y - b.y);
    for (const chicken of chickens) {
      const origX = chicken.x;
      chicken.x = origX - this.cameraX;
      chicken.render(ctx);
      chicken.x = origX;
    }
  }

  exit() {
    if (this.onKeyDown) {
      window.removeEventListener("keydown", this.onKeyDown);
      this.onKeyDown = null;
    }
    this.chicken = null;
  }
}
