import { Chicken } from "../entities/chicken.js";
import { CustomizeOverlay } from "../ui/customize-overlay.js";
import { NetworkSync } from "../engine/network-sync.js";
import { SPRITE_SETS } from "../engine/assets.js";

export class GameScene {
  /**
   * @param {{ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, viewport: { width: number, height: number }, assets: Object, input: import('../engine/input.js').InputManager, network: import('../engine/network.js').NetworkManager}} context
   */
  constructor(context) {
    this.ctx = context.ctx;
    this.canvas = context.canvas;
    this.viewport = context.viewport;
    this.canvasW = this.viewport.width;
    this.canvasH = this.viewport.height;
    this.assets = context.assets;
    this.input = context.input;
    this.network = context.network;
    this.cloudLayer = context.cloudLayer;
    this.rng = context.rng;
    this.chicken = null;
    this.overlay = null;
    this.networkSync = null;
    this.cameraX = 0;
  }

  enter() {
    this.chicken = new Chicken(this.input, this.assets, {
      width: this.canvasW,
      height: this.canvasH,
    });

    // random initial appearance
    const randomSet =
      SPRITE_SETS[Math.floor(Math.random() * SPRITE_SETS.length)].name;
    this.chicken.setSpriteSet(randomSet);

    // customization overlay
    this.overlay = new CustomizeOverlay(
      this.canvas,
      this.assets,
      (spriteSet, colorIndex, name) => {
        this.chicken.setSpriteSet(spriteSet);
        this.chicken.setColorIndex(colorIndex);
        this.chicken.name = name;
        this.network.sendCustomize(spriteSet, colorIndex, name);
      },
    );
    this.overlay.selectedSpriteSet = randomSet;

    // network sync
    this.networkSync = new NetworkSync(this.network, this.assets);
    this.networkSync.init(this.chicken, this.overlay);

    // ground tile config
    this.tileSize = 16;
    this.tileScale = 3;
    this.drawSize = this.tileSize * this.tileScale;
    this.groundRows = Math.ceil(
      (this.canvasH - (this.chicken.minY + 30)) / this.drawSize,
    );

    // derive tile counts from tileset width
    const { groundTileset, groundEdgeTileset } = this.assets.environment;
    this.edgeTileCount = groundEdgeTileset.width / this.tileSize;
    this.groundTileCount = groundTileset.width / this.tileSize;
  }

  /** @param {number} dt */
  update(dt) {
    this.cloudLayer.update();
    this.chicken.update(dt);
    this.networkSync.update(this.chicken);

    // center camera on chicken
    this.cameraX = this.chicken.x + this.chicken.width / 2 - this.canvasW / 2;
  }

  render() {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.canvasW, this.canvasH);

    // draw clouds behind ground
    this.cloudLayer.render(ctx, this.cameraX);

    this.renderGround(ctx);

    // draw all chickens sorted by y, offset by camera
    const allChickens = [this.chicken, ...this.networkSync.getRemoteChickens()];
    allChickens.sort((a, b) => a.y - b.y);
    for (const chicken of allChickens) {
      const origX = chicken.x;
      chicken.x = origX - this.cameraX;
      chicken.render(ctx);
      chicken.x = origX;
    }
  }

  /**
   * Draw tiled ground (infinite scroll). Each tile is chosen by rng.hash(col, row),
   * so the same world column always picks the same tile variant regardless of scroll
   * direction. Only the visible columns are drawn each frame.
   */
  renderGround(ctx) {
    const horizonY = this.chicken.minY + 30;
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

  exit() {
    this.chicken = null;
    if (this.networkSync) {
      this.networkSync.destroy();
      this.networkSync = null;
    }
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }
}
