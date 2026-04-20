import { ChatOverlay } from "../ui/chat-overlay.js";

export class BaseScene {
  /**
   * @param {{ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, viewport: {width: number, height: number}, assets: Object, input: import('../engine/input.js').InputManager, network: import('../engine/network.js').NetworkManager, networkSync: import('../engine/network-sync.js').NetworkSync, switchScene: Function, cloudLayer: import('./cloud-layer.js').CloudLayer, rng: import('../engine/seeded-random.js').SeededRandom, horizonY: number, appearance: Object}} context
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
    this.switchScene = context.switchScene;
    this.cloudLayer = context.cloudLayer;
    this.rng = context.rng;
    this.horizonY = context.horizonY;
    this.networkSync = context.networkSync;
    this.context = context;

    this.chicken = null;
    this.cameraX = 0;
    this.onKeyDown = null;
    this.chatOverlay = null;
    this.onChatKey = null;
  }

  /** Set up chat input overlay and T-key listener. */
  initChat() {
    this.chatOverlay = new ChatOverlay(this.canvas, (text) => {
      this.network.sendChat(text);
    });

    this.onChatKey = (e) => {
      if (e.code === "KeyT" && !this.chatOverlay.isOpen) {
        e.preventDefault();
        this.chatOverlay.open();
      }
    };
    window.addEventListener("keydown", this.onChatKey);
  }

  /**
   * Advance chat bubble timers for all chickens.
   * @param {import('../entities/base-chicken.js').BaseChicken[]} chickens
   * @param {number} dt - elapsed time in seconds
   */
  updateChat(chickens, dt) {
    for (const c of chickens) c.updateChat(dt);
  }

  /** Tear down chat overlay and listener. */
  exitChat() {
    if (this.onChatKey) {
      window.removeEventListener("keydown", this.onChatKey);
      this.onChatKey = null;
    }
    this.chatOverlay?.destroy();
    this.chatOverlay = null;
  }

  /** Precompute ground tile sizes and counts from the environment tilesets. */
  initGround() {
    this.tileSize = 16;
    this.tileScale = 3;
    this.drawSize = this.tileSize * this.tileScale;
    this.groundRows = (this.canvasH - this.horizonY) / this.drawSize;

    const { groundTileset, groundEdgeTileset } = this.assets.environment;
    this.edgeTileCount = groundEdgeTileset.width / this.tileSize;
    this.groundTileCount = groundTileset.width / this.tileSize;
  }

  /** Clear the canvas and draw clouds + ground. */
  renderBackground() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);
    this.cloudLayer.render(ctx, this.cameraX);
    this.renderGround(ctx);
  }

  /**
   * Draw tiled ground with infinite scroll. Each tile is chosen by rng.hash(col, row)
   * so the same world column always picks the same variant regardless of camera position.
   * @param {CanvasRenderingContext2D} ctx
   */
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

  /**
   * Render chickens sorted by y-depth, offset by camera position.
   * @param {import('../entities/base-chicken.js').BaseChicken[]} chickens
   */
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

  /** Clean up event listeners and null out the local chicken. */
  exit() {
    if (this.onKeyDown) {
      window.removeEventListener("keydown", this.onKeyDown);
      this.onKeyDown = null;
    }
    this.exitChat();
    this.chicken = null;
  }
}
