import { Chicken } from "../entities/chicken.js";
import { Cloud } from "../entities/cloud.js";
import { CustomizeOverlay } from "../ui/customize-overlay.js";
import { NetworkSync } from "../engine/network-sync.js";
import { SPRITE_SETS } from "../engine/assets.js";
import { SeededRandom } from "../engine/seeded-random.js";

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
    this.chicken = null;
    this.overlay = null;
    this.networkSync = null;
    this.cameraX = 0;
    this.rng = null;
    this.cloudCache = new Map(); // chunkIndex -> Cloud[]
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

    // world seed — shared across all clients via the server
    const mapSeed = this.network.mapSeed ??
      Math.floor(Math.random() * 0x7fffffff);
    this.rng = new SeededRandom(mapSeed);

    // cloud chunk config — small chunks so clouds stay dense despite parallax
    this.cloudChunkSize = 200;
    this.cloudCache = new Map();

    // ground tile config
    this.tileSize = 16;
    this.tileScale = 3;
    this.drawSize = this.tileSize * this.tileScale;
    this.groundRows = Math.ceil(
      (this.canvasH - (this.chicken.minY + 30)) / this.drawSize,
    );

    // tileset layout: row ranges and column count per row
    this.tilesetConfig = {
      surfaceRows: [0, 1, 2, 3],
      undergroundRows: [4, 5, 6, 7, 8],
      cols: 2,
      singleColRows: new Set([8]),
    };
  }

  /** Generate clouds for a given chunk index, cached */
  getCloudsForChunk(chunkIndex) {
    if (this.cloudCache.has(chunkIndex)) return this.cloudCache.get(chunkIndex);

    const clouds = [];
    const cloudImages = this.assets.environment.clouds;
    const hash = this.rng.hash(chunkIndex, 999);
    const count = hash % 4; // 0, 1, or 2 clouds per chunk

    for (let i = 0; i < count; i++) {
      const h = this.rng.hash(chunkIndex, i);
      const image = cloudImages[h % cloudImages.length];
      const depth = ((h >> 4) % 100) / 100;
      const x = chunkIndex * this.cloudChunkSize +
        ((h >> 8) % 1000) / 1000 * this.cloudChunkSize;
      const y = (h >> 12) % 130;
      clouds.push(new Cloud(image, x, y, depth));
    }
    // sort so far clouds render behind near clouds
    clouds.sort((a, b) => a.opacity - b.opacity);

    this.cloudCache.set(chunkIndex, clouds);
    return clouds;
  }

  /** @param {number} dt */
  update(dt) {
    this.chicken.update(dt);
    this.networkSync.update(this.chicken);
    // center camera on chicken
    this.cameraX = this.chicken.x + this.chicken.width / 2 - this.canvasW / 2;
    // drift visible clouds
    for (const clouds of this.cloudCache.values()) {
      for (const cloud of clouds) {
        cloud.update();
      }
    }
  }

  render() {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.canvasW, this.canvasH);

    // draw clouds behind ground — generate per chunk, render visible ones
    // use the max parallax range (0.5) to determine visible world-x span for clouds
    const cloudWorldLeft = this.cameraX * 0.2;
    const cloudWorldRight = this.cameraX * 0.5 + this.canvasW;
    const startChunk = Math.floor(cloudWorldLeft / this.cloudChunkSize) - 1;
    const endChunk = Math.floor(cloudWorldRight / this.cloudChunkSize) + 1;
    for (let ci = startChunk; ci <= endChunk; ci++) {
      for (const cloud of this.getCloudsForChunk(ci)) {
        cloud.render(ctx, this.cameraX);
      }
    }

    // draw tiled ground (infinite scroll)
    const horizonY = this.chicken.minY + 30;
    const { tileSize, drawSize, groundRows } = this;
    const tileset = this.assets.environment.groundTileset;

    // figure out which world columns are visible
    const startCol = Math.floor(this.cameraX / drawSize);
    const visibleCols = Math.ceil(this.canvasW / drawSize) + 1;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const { surfaceRows, undergroundRows, singleColRows } = this.tilesetConfig;
    for (let row = 0; row < groundRows; row++) {
      const candidates = row === 0 ? surfaceRows : undergroundRows;
      for (let i = 0; i < visibleCols; i++) {
        const worldCol = startCol + i;
        const hash = this.rng.hash(worldCol, row);
        const tileRow = candidates[hash % candidates.length];
        const tileCol = singleColRows.has(tileRow) ? 0 : (hash >> 8) % 2;
        const screenX = worldCol * drawSize - this.cameraX;
        ctx.drawImage(
          tileset,
          tileCol * tileSize,
          tileRow * tileSize,
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
